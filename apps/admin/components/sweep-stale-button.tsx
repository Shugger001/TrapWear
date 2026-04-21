"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SweepStaleButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/super/sweep-stale-orders", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Sweep failed");
      setPending(false);
      return;
    }
    setMessage(`Cancelled ${data.cancelled as number} stale order(s).`);
    router.refresh();
    setPending(false);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:opacity-60"
      >
        {pending ? "Running…" : "Run sweeper now"}
      </button>
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
