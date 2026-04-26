'use client';

// Playbook viewer. Lists the default response playbooks for the current
// facility type. Customizations are tracked in component state — wiring
// them to a `facilityPlaybooks` collection lands in Phase 2 once the
// mesh-coordinator owns playbook execution.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { playbooksForFacility, type Playbook, type PlaybookStep } from '@scr-mesh/playbooks';
import { FACILITY_THEME } from '@scr-mesh/constants';

export default function PlaybooksPage() {
  const { facility } = useCurrentFacility();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);

  useEffect(() => {
    if (!facility) return;
    setPlaybooks(playbooksForFacility(facility.data.type));
  }, [facility]);

  if (!facility) {
    return <p className="text-sm text-muted-foreground">Loading facility…</p>;
  }

  const theme = FACILITY_THEME[facility.data.type];

  function updateStep(playbookId: string, stepId: string, patch: Partial<PlaybookStep>) {
    setPlaybooks((prev) =>
      prev.map((p) =>
        p.id === playbookId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }
          : p,
      ),
    );
  }

  function addStep(playbookId: string) {
    setPlaybooks((prev) =>
      prev.map((p) =>
        p.id === playbookId
          ? {
              ...p,
              steps: [
                ...p.steps,
                {
                  id: `step-${Date.now()}`,
                  action: 'New action',
                  targetRole: 'employee',
                  ttaSeconds: 60,
                },
              ],
            }
          : p,
      ),
    );
  }

  function removeStep(playbookId: string, stepId: string) {
    setPlaybooks((prev) =>
      prev.map((p) => (p.id === playbookId ? { ...p, steps: p.steps.filter((s) => s.id !== stepId) } : p)),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Playbooks</h1>
        <p className="text-sm text-muted-foreground">
          Default response procedures for {theme.label}. Per-facility overrides land in Phase 2.
        </p>
      </div>

      {playbooks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No playbooks defined yet for {theme.label}.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {playbooks.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className={theme.accentClass}>{p.facilityType}</Badge>
                <CardTitle>{p.title}</CardTitle>
              </div>
              <CardDescription>
                Triggered by <code>{p.incidentType}</code> · {p.steps.length} step{p.steps.length === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.steps.map((s, idx) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-1 text-xs font-semibold text-muted-foreground">#{idx + 1}</div>
                    <div className="md:col-span-7">
                      <Label className="mb-1 block text-xs">Action</Label>
                      <Textarea
                        rows={2}
                        value={s.action}
                        onChange={(e) => updateStep(p.id, s.id, { action: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block text-xs">Target role</Label>
                      <Input
                        value={s.targetRole}
                        onChange={(e) => updateStep(p.id, s.id, { targetRole: e.target.value as PlaybookStep['targetRole'] })}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="mb-1 block text-xs">TTA (s)</Label>
                      <Input
                        type="number"
                        value={s.ttaSeconds}
                        onChange={(e) => updateStep(p.id, s.id, { ttaSeconds: Number(e.target.value) })}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button variant="outline" size="sm" onClick={() => removeStep(p.id, s.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  {s.meshEventOnFail && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      On miss: publish mesh event <Badge variant="outline">{s.meshEventOnFail}</Badge>
                    </p>
                  )}
                </div>
              ))}

              <Separator />
              <Button variant="outline" size="sm" onClick={() => addStep(p.id)}>
                Add step
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
