export default function MaintenancePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-trap-navy-900">TrapWear is updating</h1>
      <p className="mt-3 text-trap-sky-900/80">
        We are shipping something special. Flip{" "}
        <code className="rounded bg-white px-1 py-0.5 text-sm">MAINTENANCE_MODE</code> off to continue.
      </p>
    </div>
  );
}
