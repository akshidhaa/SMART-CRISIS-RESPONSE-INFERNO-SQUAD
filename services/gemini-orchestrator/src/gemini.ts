// Gemini 1.5 Pro client — builds the structured prompt, calls the API,
// parses JSON, and retries once on failure.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger.js';

const SYSTEM_PROMPT = `You are the SCR-Mesh crisis triage AI.
Given a structured incident report from a hospital, hotel, school, college, or factory, output strictly valid JSON matching the schema below.
Consider facility type in your reasoning — a fire in a factory with chemical inventory is more severe than a small kitchen fire in a hotel.
Generate culturally appropriate and concise translations (max 140 chars).
Recommend mesh events only when genuinely warranted to avoid alert fatigue across the community.

You MUST output ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this schema exactly:
{
  "severity": "low" | "medium" | "high" | "critical",
  "refinedSummary": "string (max 500 chars)",
  "multiLanguageSummaries": {
    "en": "English (max 140 chars)",
    "hi": "Hindi (max 140 chars)",
    "ta": "Tamil (max 140 chars)",
    "te": "Telugu (max 140 chars)",
    "mr": "Marathi (max 140 chars)",
    "bn": "Bengali (max 140 chars)"
  },
  "suggestedProtocolDeltas": ["additional steps beyond the base playbook"],
  "recommendedRoles": ["roles that should be notified"],
  "estimatedResponseMinutes": number,
  "meshEventRecommendations": [
    {
      "type": "PREPARE_TRAUMA_TEAMS | EVACUATE_DOWNWIND | LOCKDOWN_NEARBY | SHELTER_REQUEST | TRAFFIC_DIVERSION | BLOOD_DONATION_NEEDED",
      "target": "target facility type",
      "radiusKm": number,
      "reason": "string (max 200 chars)"
    }
  ]
}`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeIncidentContext(
  facilityType: string,
  incidentType: string,
  reporterRole: string,
  location: { zone?: string; floor?: string } | undefined,
  description: string,
  basePlaybookSteps: string[],
): Promise<Record<string, unknown>> {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  });

  const userPrompt = `
CONTEXT:
Facility Type: ${facilityType}
Incident Type: ${incidentType}
Reporter Role: ${reporterRole}
Location: Zone ${location?.zone ?? 'unknown'}, Floor ${location?.floor ?? 'unknown'}
User Description: "${description}"

BASE PLAYBOOK STEPS:
${basePlaybookSteps.map((s) => '- ' + s).join('\n')}

Analyze this situation and generate the orchestrated response data as JSON.`;

  const fullPrompt = SYSTEM_PROMPT + '\n\n' + userPrompt;

  // Attempt 1
  try {
    logger.info('Calling Gemini (attempt 1)', { facilityType, incidentType });
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    return JSON.parse(extractJson(text));
  } catch (err) {
    logger.warn('Gemini attempt 1 failed, retrying with stricter prompt', {
      error: String(err),
    });
  }

  // Attempt 2 — stricter prompt
  const retryPrompt =
    fullPrompt +
    '\n\nIMPORTANT: Your previous response was invalid. Output ONLY a single JSON object. Start with { and end with }. No markdown, no backticks.';

  const retryResult = await model.generateContent(retryPrompt);
  const retryText = retryResult.response.text();
  return JSON.parse(extractJson(retryText));
}

/** Strip markdown code fences if Gemini wraps the response. */
function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}
