"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Usage" },
  { href: "/keys", label: "API keys" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/experiments", label: "Experiments" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main">
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={path === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
