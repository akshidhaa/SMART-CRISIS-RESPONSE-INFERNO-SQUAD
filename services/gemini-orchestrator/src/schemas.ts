// Zod schemas for validating the Gemini JSON response.

import { z } from 'zod';

export const MeshEventRecommendationSchema = z.object({
  type: z.string().describe('Mesh event type, e.g. PREPARE_TRAUMA_TEAMS'),
  target: z.string().describe('Target facility type, e.g. hospital'),
  radiusKm: z.number().min(0).max(100),
  reason: z.string().max(200),
});

export const GeminiResponseSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  refinedSummary: z.string().max(500),
  multiLanguageSummaries: z.object({
    en: z.string().max(140),
    hi: z.string().max(140),
    ta: z.string().max(140),
    te: z.string().max(140),
    mr: z.string().max(140),
    bn: z.string().max(140),
  }),
  suggestedProtocolDeltas: z.array(z.string()).describe('Additions to the base playbook'),
  recommendedRoles: z.array(z.string()).describe('Roles to notify'),
  estimatedResponseMinutes: z.number().min(0).max(1440),
  meshEventRecommendations: z.array(MeshEventRecommendationSchema),
});

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;
export type MeshEventRecommendation = z.infer<typeof MeshEventRecommendationSchema>;
