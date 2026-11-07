"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimeSearchForm } from "./AnimeSearchForm";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label:"List", href: "/list" },
  { label: "City", href: "/City" },
  { label: "Social", href: "/social" },
  { label: "About", href: "/about" },
];

export default function NewNavbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const controlNavbar = () => {
      setIsVisible(window.scrollY <= 100);
    };

    window.addEventListener("scroll", controlNavbar, { passive: true });
    return () => window.removeEventListener("scroll", controlNavbar);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-all duration-300 sm:px-6 sm:pt-4 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 rounded-2xl border border-white/10 bg-[#111827]/90 p-2.5 shadow-[0_12px_35px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg text-white transition hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
          >
            <span
              aria-hidden="true"
              className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-200/10"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_12px_#fde68a]" />
              <span className="absolute h-5 w-5 rotate-[-35deg] rounded-[50%] border border-amber-100/60" />
            </span>
            <span className="text-lg font-black tracking-tight sm:text-xl">
              Orbit
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-0.5 sm:gap-1"
          >
            {navigationLinks.map(({ label, href }) => {
              const isActive = pathname === href;

              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:px-3 sm:text-sm ${
                    isActive
                      ? "bg-amber-200/10 text-amber-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Suspense fallback={<div className="h-10 sm:w-80" />}>
          <AnimeSearchForm />
        </Suspense>
      </div>
    </header>
  );
}


