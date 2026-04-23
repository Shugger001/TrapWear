"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

export function AdminShell({ children, isSuperadmin }: { children: React.ReactNode; isSuperadmin: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-dvh bg-slate-100 text-slate-900">
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="admin-mobile-nav"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(17.5rem,88vw)] flex-col border-r border-slate-800/70 bg-gradient-to-b from-[#141d2d] via-[#111a2a] to-[#0c1322] shadow-2xl shadow-black/40 backdrop-blur-md transition-transform duration-200 ease-out md:static md:z-0 md:w-[15.5rem] md:max-w-none md:translate-x-0 md:shadow-none ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <AdminSidebar isSuperadmin={isSuperadmin} onNavigate={() => setMenuOpen(false)} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-300 bg-white/95 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md md:hidden">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-nav"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 active:bg-slate-100"
            onClick={() => setMenuOpen(true)}
          >
            <span className="sr-only">Open menu</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">TrapWear Admin</p>
            <p className="truncate text-xs text-slate-500">Private suite</p>
          </div>
        </header>

        <div className="relative flex-1 overflow-x-auto bg-gradient-to-r from-slate-100 to-slate-200/70 pb-[env(safe-area-inset-bottom)]">
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}
