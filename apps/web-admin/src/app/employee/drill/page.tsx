'use client';

export default function EmployeeDrill() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh] space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Drill Mode</h2>
      <p className="text-sm text-muted-foreground">
        Practice response playbooks here. Simulated events will not trigger SMS or outbound mesh alerts.
      </p>
    </div>
  );
}
