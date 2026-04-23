"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CouponActiveToggle(props: { id: string; active: boolean; variant?: "light" | "dark" }) {
  const dark = props.variant === "dark";
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const res = await fetch("/api/super/coupons", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: props.id, active: !props.active }),
    });
    if (res.ok) {
      router.refresh();
    }
    setPending(false);
  }

  const cls = dark
    ? props.active
      ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/35 hover:bg-emerald-500/30"
      : "bg-slate-700 text-slate-200 ring-1 ring-slate-600 hover:bg-slate-600"
    : props.active
      ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
      : "bg-trap-sky-100 text-trap-navy-900 hover:bg-trap-sky-200";

  return (
    <button type="button" disabled={pending} onClick={toggle} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${cls} disabled:opacity-60`}>
      {pending ? "…" : props.active ? "Active" : "Inactive"}
    </button>
  );
}
