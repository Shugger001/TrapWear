"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const statuses = ["pending_payment", "paid", "fulfilled", "cancelled"] as const;

export function OrderStatusForm(props: { orderId: string; status: string; theme?: "light" | "dark" }) {
  const dark = props.theme === "dark";
  const router = useRouter();
  const [status, setStatus] = useState(props.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/orders/${props.orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  return (
    <section
      className={
        dark
          ? "rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/25 sm:p-6"
          : "rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm"
      }
    >
      <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-trap-navy-900"}`}>Order status</h2>
      <p className={`mt-2 text-sm ${dark ? "text-slate-400" : "text-trap-navy-900/70"}`}>
        Updates are audited. Typical flow: paid → fulfilled (or cancelled with a policy check in real ops).
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full space-y-1 sm:w-auto">
          <label className={`text-sm font-medium ${dark ? "text-slate-300" : ""}`} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className={
              dark
                ? "min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white sm:w-64"
                : "rounded-lg border border-trap-sky-200 bg-white px-3 py-2 text-sm"
            }
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className={
            dark
              ? "min-h-11 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              : "rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? <p className={`mt-3 text-sm ${dark ? "text-red-400" : "text-red-700"}`}>{error}</p> : null}
    </section>
  );
}
