import Link from "next/link";
import { getCustomerFromSession } from "@/lib/customer-session";
import { UserAvatar } from "@/components/user-avatar";

export async function SiteHeader() {
  const customer = await getCustomerFromSession();

  return (
    <header className="border-b border-trap-sky-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-trap-sky-900">
          TrapWear
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-trap-navy-900">
          <Link href="/products" className="hover:text-trap-sky-600">
            Shop
          </Link>
          <Link href="/admin" className="hover:text-trap-sky-600">
            Admin
          </Link>
          <Link href="/cart" className="hover:text-trap-sky-600">
            Cart
          </Link>
          {customer ? (
            <Link href="/account" className="flex items-center gap-2 hover:text-trap-sky-600">
              <UserAvatar name={customer.name} email={customer.email} size="sm" />
              <span>Account</span>
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="hover:text-trap-sky-600">
                Sign in
              </Link>
              <Link href="/sign-up" className="hover:text-trap-sky-600">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
