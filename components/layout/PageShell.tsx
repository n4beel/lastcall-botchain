"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

export type NavItem = { href: string; label: string };

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavItem[];
  title?: string;
  description?: string;
}

/**
 * Banded shell: full-bleed sections, each on its own ground.
 *
 * Lastcall is about a deadline, and a deadline is a state rather than a page. Banding lets the
 * page carry that — a dark title band, a lighter working band — instead of stacking cards on one
 * surface. The standing notice in the header band is deliberate: whoever acts first wins, and a
 * user who misreads that loses the money.
 */
export default function PageShell({ children, nav = [], title, description }: PageShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <div className="flex-shrink-0" style={{ background: "#0F0C0B" }}>
        <div className="mx-auto w-full px-5 md:px-8 py-4 flex items-center justify-between gap-4" style={{ maxWidth: "980px" }}>
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
              <path d="M10 5.5 L10 10 L13.5 12" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-[18px] font-extrabold tracking-[-0.035em]">{app.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <div style={{ width: "160px" }}><ConnectButton /></div>
          </div>
        </div>
      </div>

      {(title || description) && (
        <div
          className="flex-shrink-0"
          style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="mx-auto w-full px-5 md:px-8 py-10" style={{ maxWidth: "980px" }}>
            {title && <h1 className="text-[40px] md:text-[54px]" style={{ color: "var(--text-primary)" }}>{title}</h1>}
            {description && (
              <p className="mt-4 text-[16px]" style={{ color: "var(--text-secondary)", maxWidth: "56ch" }}>
                {description}
              </p>
            )}
            <p
              className="mt-6 inline-flex items-center gap-2 px-3 py-2 text-[12px]"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px" }}
            >
              <span aria-hidden="true">⚠</span>
              Whoever acts first wins — the owner can always withdraw, right up until the beneficiary claims
            </p>
          </div>
        </div>
      )}

      {nav.length > 1 && (
        <div className="flex-shrink-0" style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border-subtle)" }}>
          <nav className="mx-auto w-full px-5 md:px-8 flex items-center gap-6" style={{ maxWidth: "980px" }}>
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="nav-link py-3 text-[13px] font-semibold uppercase tracking-[0.06em] no-underline"
                  style={{
                    color: active ? "var(--accent)" : "var(--text-tertiary)",
                    borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <main className="flex-1 mx-auto w-full px-5 md:px-8 py-9" style={{ maxWidth: "980px" }}>
        {children}
      </main>

      <footer className="flex-shrink-0" style={{ background: "#0F0C0B" }}>
        <div className="mx-auto w-full px-5 md:px-8 py-6 flex flex-wrap items-center gap-x-5 gap-y-2" style={{ maxWidth: "980px" }}>
          <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>{app.tagline}</span>
          <div className="flex-1" />
          <BuiltOnBotChain className="text-[12px]" style={{ color: "var(--text-secondary)" }} />
          <a href="https://botchain.ai" target="_blank" rel="noreferrer" className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>botchain.ai</a>
          <a href="https://scan.botchain.ai" target="_blank" rel="noreferrer" className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>BOT Chain Explorer</a>
        </div>
      </footer>
    </div>
  );
}
