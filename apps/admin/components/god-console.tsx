"use client";

import { useState, useTransition } from "react";

type GodStatus = {
  uptimeSeconds: number;
  env: {
    databaseConfigured: boolean;
    adminJwtConfigured: boolean;
    paystackConfigured: boolean;
    resendConfigured: boolean;
  };
  maintenance: { enabled: boolean; message: string | null };
  users: { admins: number; superadmins: number; customers: number };
  products: { jerseys: number; footwear: number };
  orders: { pendingPayment: number; paid: number; fulfilled: number; cancelled: number };
};

export function GodConsole(props: { variant?: "light" | "dark" }) {
  const dark = props.variant === "dark";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GodStatus | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; email: string; name: string | null; role: string }>>([]);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetRole, setTargetRole] = useState<"admin" | "superadmin">("admin");

  async function loadStatus() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/super/god/status", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to load status.");
        return;
      }
      setStatus(data);
      setMaintenanceEnabled(Boolean(data.maintenance?.enabled));
      setMaintenanceMessage(data.maintenance?.message ?? "");
    });
  }

  async function saveMaintenance() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/super/god/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "maintenance.set",
          enabled: maintenanceEnabled,
          message: maintenanceMessage.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update maintenance.");
        return;
      }
      await loadStatus();
    });
  }

  async function updateRole() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/super/god/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "user.role.set",
          userId: targetUserId.trim(),
          role: targetRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update role.");
        return;
      }
      setTargetUserId("");
      await loadStatus();
    });
  }

  async function lookupUsers() {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/super/god/users?q=${encodeURIComponent(query.trim())}`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "User lookup failed.");
        return;
      }
      setResults(Array.isArray(data.users) ? data.users : []);
    });
  }

  const primaryBtn = dark
    ? "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
    : "rounded-lg bg-trap-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trap-sky-500 disabled:opacity-60";
  const secondaryBtn = dark
    ? "rounded-lg border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
    : "rounded-lg border border-trap-sky-300 px-4 py-2 text-sm font-semibold text-trap-navy-900 hover:bg-trap-sky-50 disabled:opacity-60";
  const statBox = dark
    ? "rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300 [&>p]:mt-1 [&>p:first-child]:mt-0"
    : "rounded-xl border border-trap-sky-100 bg-trap-sky-50 p-4 text-sm [&>p]:mt-1 [&>p:first-child]:mt-0";
  const statTitle = dark ? "font-semibold text-white" : "font-semibold text-trap-navy-900";
  const panel = dark
    ? "rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
    : "rounded-xl border border-trap-sky-100 bg-white p-4 space-y-3";
  const panelTitle = dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-trap-navy-900";
  const field = dark
    ? "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
    : "w-full rounded-lg border border-trap-sky-200 px-3 py-2 text-sm";
  const fieldMono = `${field} font-mono`;
  const labelRow = dark ? "flex items-center gap-2 text-sm text-slate-300" : "flex items-center gap-2 text-sm";
  const errCls = dark ? "text-sm text-red-400" : "text-sm text-red-700";
  const listWrap = dark ? "max-h-52 overflow-auto rounded-lg border border-slate-800" : "max-h-52 overflow-auto rounded-lg border border-trap-sky-100";
  const listRow = dark
    ? "flex w-full items-center justify-between border-b border-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900/80 last:border-b-0"
    : "flex w-full items-center justify-between border-b border-trap-sky-100 px-3 py-2 text-left text-sm hover:bg-trap-sky-50";
  const listEmail = dark ? "block truncate font-medium text-white" : "block truncate font-medium text-trap-navy-900";
  const listMeta = dark ? "block truncate text-xs text-slate-400" : "block truncate text-xs text-trap-navy-900/70";
  const useBadge = dark
    ? "rounded bg-indigo-500/20 px-2 py-1 text-xs font-semibold text-indigo-200"
    : "rounded bg-trap-sky-100 px-2 py-1 text-xs font-semibold text-trap-sky-900";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={loadStatus} disabled={pending} className={primaryBtn}>
          {pending ? "Working..." : "Refresh God Status"}
        </button>
      </div>

      {error ? <p className={errCls}>{error}</p> : null}

      {status ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={statBox}>
            <p className={statTitle}>System</p>
            <p>Uptime: {status.uptimeSeconds}s</p>
            <p>DB: {status.env.databaseConfigured ? "OK" : "Missing"}</p>
            <p>Admin JWT: {status.env.adminJwtConfigured ? "OK" : "Missing"}</p>
            <p>Paystack: {status.env.paystackConfigured ? "OK" : "Missing"}</p>
            <p>Resend: {status.env.resendConfigured ? "OK" : "Missing"}</p>
          </div>
          <div className={statBox}>
            <p className={statTitle}>Counts</p>
            <p>
              Users: {status.users.customers} customers / {status.users.admins} admins / {status.users.superadmins} superadmins
            </p>
            <p>
              Products: {status.products.jerseys} jerseys / {status.products.footwear} footwear
            </p>
            <p>
              Orders: {status.orders.pendingPayment} pending, {status.orders.paid} paid, {status.orders.fulfilled} fulfilled,{" "}
              {status.orders.cancelled} cancelled
            </p>
          </div>
        </div>
      ) : null}

      <div className={panel}>
        <p className={panelTitle}>Maintenance Control</p>
        <label className={labelRow}>
          <input type="checkbox" checked={maintenanceEnabled} onChange={(e) => setMaintenanceEnabled(e.target.checked)} />
          Enable maintenance mode
        </label>
        <input
          value={maintenanceMessage}
          onChange={(e) => setMaintenanceMessage(e.target.value)}
          placeholder="Maintenance message (optional)"
          className={field}
        />
        <button type="button" onClick={saveMaintenance} disabled={pending} className={secondaryBtn}>
          Save maintenance settings
        </button>
      </div>

      <div className={panel}>
        <p className={panelTitle}>User Role Escalation</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user email or name"
            className={field}
          />
          <button type="button" onClick={lookupUsers} disabled={pending || !query.trim()} className={`shrink-0 ${secondaryBtn}`}>
            Lookup
          </button>
        </div>
        {results.length > 0 ? (
          <div className={listWrap}>
            {results.map((u) => (
              <button key={u.id} type="button" onClick={() => setTargetUserId(u.id)} className={listRow}>
                <span className="min-w-0">
                  <span className={listEmail}>{u.email}</span>
                  <span className={listMeta}>
                    {u.name ?? "No name"} · {u.role}
                  </span>
                </span>
                <span className={useBadge}>Use</span>
              </button>
            ))}
          </div>
        ) : null}
        <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="Target user UUID" className={fieldMono} />
        <select value={targetRole} onChange={(e) => setTargetRole(e.target.value as "admin" | "superadmin")} className={field}>
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
        </select>
        <button type="button" onClick={updateRole} disabled={pending || !targetUserId.trim()} className={secondaryBtn}>
          Update user role
        </button>
      </div>
    </div>
  );
}
