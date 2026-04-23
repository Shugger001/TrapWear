"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FlagToggleForm(props: { enabled: boolean; variant?: "light" | "dark" }) {
  const dark = props.variant === "dark";
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

  const stateText = dark ? "text-sm text-slate-300" : "text-sm text-trap-navy-900";
  const enableBtn = dark
    ? "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:cursor-not-allowed disabled:opacity-60";
  const disableBtn = dark
    ? "rounded-lg border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-lg border border-trap-sky-200 bg-white px-4 py-2 text-sm font-semibold text-trap-navy-900 hover:bg-trap-sky-50 disabled:cursor-not-allowed disabled:opacity-60";
  const err = dark ? "text-sm text-red-400 sm:w-full" : "text-sm text-red-700 sm:w-full";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className={stateText}>
        Current state:{" "}
        <span className={dark ? "font-semibold text-white" : "font-semibold text-trap-navy-900"}>{enabled ? "ON" : "OFF"}</span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        <button type="button" disabled={pending || enabled} className={`min-h-11 w-full sm:w-auto ${enableBtn}`} onClick={() => save(true)}>
          Enable
        </button>
        <button type="button" disabled={pending || !enabled} className={`min-h-11 w-full sm:w-auto ${disableBtn}`} onClick={() => save(false)}>
          Disable
        </button>
      </div>
      {error ? <p className={err}>{error}</p> : null}
    </div>
  );
}
