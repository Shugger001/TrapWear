import { createHmac, timingSafeEqual } from "crypto";

const BASE = "https://api.paystack.co";

export function getPaystackSecret(): string | null {
  const s = process.env.PAYSTACK_SECRET_KEY;
  return s?.trim() || null;
}

/** True when hosted checkout can initialize a Paystack transaction (secret key set). */
export function isPaystackConfigured(): boolean {
  return getPaystackSecret() !== null;
}

/** Paystack docs: HMAC SHA512 of raw body with secret key; header `x-paystack-signature`. */
export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const hash = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function paystackInitialize(params: {
  email: string;
  /** Minor units (kobo for NGN, cents for USD, etc.) — must match `PAYSTACK_CURRENCY`. */
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const secret = getPaystackSecret();
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not set");
  }

  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { authorization_url: string; reference: string };
  };

  if (!json.status || !json.data?.authorization_url) {
    throw new Error(json.message ?? "Paystack initialize failed");
  }

  return {
    authorizationUrl: json.data.authorization_url,
    reference: json.data.reference,
  };
}

export type PaystackVerifyData = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer: { email?: string | null } | null;
  metadata: Record<string, unknown> | null;
};

export async function paystackVerify(reference: string): Promise<PaystackVerifyData | null> {
  const secret = getPaystackSecret();
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not set");
  }

  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: PaystackVerifyData;
  };

  if (!json.status || !json.data) {
    return null;
  }

  return json.data;
}

export function paystackCurrency(): string {
  return (process.env.PAYSTACK_CURRENCY ?? "NGN").trim() || "NGN";
}
