'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';

const INCIDENT_TYPES: Record<string, string[]> = {
  hospital: ['fire_outbreak', 'medical_emergency', 'mass_casualty', 'chemical_spill', 'power_failure', 'security_breach', 'equipment_failure', 'evacuation_needed'],
  hotel:    ['fire_outbreak', 'evacuation_needed', 'security_breach', 'crowd_surge', 'power_failure', 'chemical_spill', 'medical_emergency', 'equipment_failure'],
  school:   ['fire_outbreak', 'lockdown', 'medical_emergency', 'crowd_surge', 'evacuation_needed', 'security_breach', 'power_failure', 'equipment_failure'],
  college:  ['fire_outbreak', 'chemical_spill', 'medical_emergency', 'crowd_surge', 'evacuation_needed', 'security_breach', 'power_failure', 'lockdown'],
  factory:  ['fire_outbreak', 'chemical_spill', 'equipment_failure', 'evacuation_needed', 'power_failure', 'medical_emergency', 'security_breach', 'crowd_surge'],
};

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
type Severity = typeof SEVERITIES[number];

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  low:      { bg: '#052e16', text: '#86efac', border: '#16a34a' },
  medium:   { bg: '#422006', text: '#fcd34d', border: '#d97706' },
  high:     { bg: '#431407', text: '#fb923c', border: '#ea580c' },
  critical: { bg: '#450a0a', text: '#f87171', border: '#ef4444' },
};

interface CreateIncidentModalProps {
  facilityId: string;
  facilityName: string;
  facilityType: string;
  zone: string;
  onClose: () => void;
  onCreated: (incidentId: string) => void;
}

export function CreateIncidentModal({
  facilityId,
  facilityName,
  facilityType,
  zone,
  onClose,
  onCreated,
}: CreateIncidentModalProps) {
  const { user } = useAuth();

  const types = INCIDENT_TYPES[facilityType] ?? INCIDENT_TYPES.hospital;
  const [incidentType, setIncidentType] = useState(types[0]);
  const [severity, setSeverity] = useState<Severity>('high');
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = description.trim().length >= 10 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const ref = await addDoc(collection(db, 'incidents'), {
        facilityId,
        facilityType,
        type: incidentType,
        severity,
        status: 'reported',
        location: { zone, floor: floor.trim() || '1' },
        description: description.trim(),
        reporterId: user?.uid ?? 'admin',
        reporterRole: 'admin',
        assignedStaff: [],
        meshEventsFired: [],
        createdAt: serverTimestamp(),
      });
      onCreated(ref.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
      setSubmitting(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-md rounded-lg border border-border bg-background shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Report Incident</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{facilityName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* Zone — read-only */}
          <div>
            <Label className="mb-1.5 block text-xs">Zone</Label>
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderColor: '#ef4444', color: '#fca5a5', backgroundColor: 'rgba(127,29,29,0.4)' }}
            >
              📍 {zone}
            </Badge>
          </div>

          {/* Incident Type */}
          <div>
            <Label htmlFor="inc-type" className="mb-1.5 block text-xs">Incident Type</Label>
            <select
              id="inc-type"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {types.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <Label className="mb-1.5 block text-xs">Severity</Label>
            <div className="flex gap-2">
              {SEVERITIES.map((s) => {
                const colors = SEVERITY_COLORS[s];
                const active = severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className="flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold capitalize transition-all"
                    style={{
                      backgroundColor: active ? colors.bg : 'transparent',
                      color: active ? colors.text : '#6b7280',
                      borderColor: active ? colors.border : '#374151',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="inc-desc" className="mb-1.5 block text-xs">
              Description <span className="text-muted-foreground">(min 10 chars)</span>
            </Label>
            <Textarea
              id="inc-desc"
              rows={3}
              placeholder="Describe the incident clearly…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
              required
            />
            {description.length > 0 && description.length < 10 && (
              <p className="mt-1 text-[10px] text-destructive">{10 - description.length} more characters needed</p>
            )}
          </div>

          {/* Floor */}
          <div>
            <Label htmlFor="inc-floor" className="mb-1.5 block text-xs">Floor <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="inc-floor"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="1"
              className="text-xs"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              className="flex-1 gap-1.5"
              disabled={!canSubmit}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? 'Reporting…' : 'Report Incident'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
