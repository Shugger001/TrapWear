import { cookies } from "next/headers";

export const CART_COOKIE = "trapwear_cart_id";

export async function getCartIdFromCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(CART_COOKIE)?.value;
}
