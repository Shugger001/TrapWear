export function orderConfirmationHtml(input: {
  orderId: string;
  totalFormatted: string;
  lines: { title: string; qty: number; lineTotal: string }[];
}) {
  const rows = input.lines
    .map(
      (l) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e0f2fe">${escapeHtml(l.title)}</td><td style="padding:8px;border-bottom:1px solid #e0f2fe;text-align:center">${l.qty}</td><td style="padding:8px;border-bottom:1px solid #e0f2fe;text-align:right">${escapeHtml(l.lineTotal)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#f0f9ff;color:#0f172a;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #bae6fd">
    <h1 style="margin:0 0 8px;font-size:20px;color:#0284c7">TrapWear</h1>
    <p style="margin:0 0 16px;font-size:15px">Thanks for your order. Payment was received.</p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b">Order ID</p>
    <p style="margin:0 0 16px;font-family:monospace;font-size:14px">${escapeHtml(input.orderId)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr><th align="left" style="padding:8px;border-bottom:2px solid #0ea5e9">Item</th><th style="padding:8px;border-bottom:2px solid #0ea5e9">Qty</th><th align="right" style="padding:8px;border-bottom:2px solid #0ea5e9">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:16px 0 0;text-align:right;font-size:16px;font-weight:600">Total: ${escapeHtml(input.totalFormatted)}</p>
    <p style="margin:24px 0 0;font-size:12px;color:#64748b">Questions? Reply to this email or visit our store.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendOrderConfirmationEmail(input: {
  to: string;
  orderId: string;
  totalFormatted: string;
  lines: { title: string; qty: number; lineTotal: string }[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: true, skipped: true };
  }

  const from = process.env.RESEND_FROM ?? "TrapWear <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: `Your TrapWear order ${input.orderId.slice(0, 8)}…`,
      html: orderConfirmationHtml(input),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }

  return { ok: true };
}
