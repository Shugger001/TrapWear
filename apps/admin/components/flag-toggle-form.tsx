"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FlagToggleForm(props: { enabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(props.enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: boolean) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/super/flags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "storefront_hero_banner", value: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      setPending(false);
      return;
    }
    setEnabled(next);
    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-trap-navy-900">
        Current state:{" "}
        <span className="font-semibold">{enabled ? "ON" : "OFF"}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || enabled}
          className="rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => save(true)}
        >
          Enable
        </button>
        <button
          type="button"
          disabled={pending || !enabled}
          className="rounded-lg border border-trap-sky-200 bg-white px-4 py-2 text-sm font-semibold text-trap-navy-900 hover:bg-trap-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => save(false)}
        >
          Disable
        </button>
      </div>
      {error ? <p className="text-sm text-red-700 sm:w-full">{error}</p> : null}
    </div>
  );
}
