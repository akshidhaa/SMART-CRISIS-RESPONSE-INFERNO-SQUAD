export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-3 p-12 text-center">
      <h1 className="text-3xl font-semibold">Forbidden</h1>
      <p className="text-muted-foreground">
        Your current role does not have access to this area. Ask a facility
        admin to adjust your permissions.
      </p>
    </main>
  );
}
