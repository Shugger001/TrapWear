"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SweepStaleButton(props: { variant?: "light" | "dark" }) {
  const dark = props.variant === "dark";
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

  const btn = dark
    ? "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
    : "rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:opacity-60";
  const ok = dark ? "text-sm text-emerald-300" : "text-sm text-emerald-800";
  const err = dark ? "text-sm text-red-400" : "text-sm text-red-700";

  return (
    <div className="space-y-3">
      <button type="button" disabled={pending} onClick={run} className={btn}>
        {pending ? "Running…" : "Run sweeper now"}
      </button>
      {message ? <p className={ok}>{message}</p> : null}
      {error ? <p className={err}>{error}</p> : null}
    </div>
  );
}
