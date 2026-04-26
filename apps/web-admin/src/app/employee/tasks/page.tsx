'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCurrentFacility } from '@/lib/useCurrentFacility';
import { PLAYBOOKS, Playbook } from '@scr-mesh/playbooks';

export default function EmployeeTasks() {
  const { currentFacilityId } = useAuth();
  const { facility } = useCurrentFacility();
  const [activePlaybooks, setActivePlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentFacilityId || !facility?.data.type) return;

    const q = query(
      collection(db, 'incidents'),
      where('facilityId', '==', currentFacilityId),
      where('status', 'in', ['reported', 'acknowledged', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const playbooks: Playbook[] = [];
      snapshot.forEach((doc) => {
        const incident = doc.data();
        const key = `${facility.data.type}:${incident.type}`;
        if (PLAYBOOKS[key] && !playbooks.find(p => p.id === key)) {
          playbooks.push(PLAYBOOKS[key]);
        }
      });
      setActivePlaybooks(playbooks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentFacilityId, facility?.data.type]);

  const toggleStep = (stepId: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
       navigator.vibrate(50); // Light haptic feedback
    }
    setCheckedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="px-1 pt-1 pb-4 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight">Active Tasks</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete mandatory playbook steps.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-sm text-muted-foreground">Loading tasks...</div>
      ) : activePlaybooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <h3 className="font-semibold text-lg text-muted-foreground">No Active Tasks</h3>
          <p className="text-sm text-muted-foreground mt-2">There are no playbooks active currently.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activePlaybooks.map((playbook) => (
            <div key={playbook.id} className="space-y-3">
              <h3 className="font-semibold px-1 text-primary">{playbook.title}</h3>
              <div className="bg-muted/10 rounded-xl border border-border overflow-hidden">
                {playbook.steps.map((step, index) => {
                  const isChecked = !!checkedSteps[step.id];
                  return (
                    <label 
                      key={step.id} 
                      className={`flex items-start gap-4 p-4 touch-manipulation cursor-pointer transition-colors ${index !== playbook.steps.length - 1 ? 'border-b border-border' : ''} ${isChecked ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                      <div className="flex-shrink-0 pt-0.5">
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                          {isChecked && <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}>
                          {step.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Role: <span className="capitalize">{step.targetRole}</span> • TTA: {step.ttaSeconds}s
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={isChecked}
                        onChange={() => toggleStep(step.id)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
