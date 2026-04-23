"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function InventoryScrollToVariant() {
  const sp = useSearchParams();
  const variantId = sp.get("variantId");

  useEffect(() => {
    if (!variantId) return;
    const el = document.getElementById(`inv-row-${variantId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-indigo-400", "rounded-xl");
    const t = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-indigo-400", "rounded-xl");
    }, 4500);
    return () => window.clearTimeout(t);
  }, [variantId]);

  return null;
}
