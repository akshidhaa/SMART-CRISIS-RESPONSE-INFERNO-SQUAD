'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useCurrentFacility } from '@/lib/useCurrentFacility';

export default function EmployeeHome() {
  const { currentFacilityId } = useAuth();
  const { facility } = useCurrentFacility();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentFacilityId) return;

    const q = query(
      collection(db, 'incidents'),
      where('facilityId', '==', currentFacilityId),
      // we could filter by zone, but for demo we show all active incidents to employees
      where('status', 'in', ['reported', 'acknowledged', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: any[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      // Sort in memory (simplifies indexes)
      results.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setIncidents(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentFacilityId]);

  const acknowledgeAlert = () => {
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="px-1 pt-1 pb-4 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight">Active Situations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Stay alert. Follow playbooks.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-sm text-muted-foreground">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-green-500/80" />
          <div>
            <h3 className="font-semibold text-lg">All Clear</h3>
            <p className="text-sm text-muted-foreground">No active incidents at {facility?.data.name || 'this facility'}.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-xl overflow-hidden shadow-sm border border-destructive/20 bg-destructive/5 relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <h3 className="font-semibold text-destructive uppercase tracking-wider text-sm">{incident.type.replace('_', ' ')}</h3>
                  </div>
                  <span className="text-xs px-2 py-1 bg-background rounded-md border shadow-sm capitalize font-medium">{incident.severity}</span>
                </div>
                
                <p className="text-sm mb-3">
                  <span className="font-semibold">Location:</span> {incident.location?.zone} {incident.location?.floor ? `(Floor ${incident.location.floor})` : ''}
                </p>
                <p className="text-sm text-muted-foreground break-words line-clamp-2">
                  {incident.description}
                </p>
                
                <div className="mt-4 pt-3 border-t border-destructive/10 flex justify-end">
                  <button 
                    onClick={acknowledgeAlert}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md text-sm font-semibold transition-colors active:scale-95 touch-manipulation w-full"
                  >
                    Hold to Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="rounded-lg bg-primary/5 p-4 border border-primary/10 mt-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Facility Protocol Reminder</p>
          {facility?.data.type === 'hospital' && 'Ensure all critical medical equipment pathways remain clear. Code Blue workflows take precedence.'}
          {facility?.data.type === 'school' && 'Guide students away from windows during lockdowns. Maintain silence.'}
          {facility?.data.type === 'factory' && 'Use appropriate PPE. If chemical spill is present, approach only from windward direction.'}
          {facility?.data.type === 'hotel' && 'Prioritize guest safety and elevator disablement during fire alarms.'}
          {facility?.data.type === 'college' && 'Direct campus crowds via designated assembly point markers.'}
        </div>
      </div>
    </div>
  );
}
