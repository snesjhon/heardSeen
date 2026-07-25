"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/lists", label: "Lists" },
  { href: "/diary", label: "Diary" },
];

// Shared nav for moving between Dashboard / Lists / Diary / sign-out.
// Bottom tab bar on mobile (thumb reach on iPhone/iPad), top bar on desktop.
export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky bottom-0 z-10 order-last border-t border-neutral-200 bg-white/90 backdrop-blur sm:sticky sm:top-0 sm:order-first sm:border-b sm:border-t-0 dark:border-neutral-800 dark:bg-black/90">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2 sm:py-3">
        <span className="hidden text-sm font-semibold sm:inline">
          heardSeen
        </span>
        <ul className="flex flex-1 items-center justify-around gap-1 sm:flex-none sm:justify-start sm:gap-4">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block rounded-md px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={handleSignOut}
          className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 sm:px-3 sm:text-sm dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
