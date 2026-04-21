"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const statuses = ["pending_payment", "paid", "fulfilled", "cancelled"] as const;

export function OrderStatusForm(props: { orderId: string; status: string }) {
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
    <section className="rounded-2xl border border-trap-sky-100 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-trap-navy-900">Order status</h2>
      <p className="mt-2 text-sm text-trap-navy-900/70">
        Updates are audited. Typical flow: paid → fulfilled (or cancelled with a policy check in real ops).
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className="rounded-lg border border-trap-sky-200 bg-white px-3 py-2 text-sm"
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
          className="rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
