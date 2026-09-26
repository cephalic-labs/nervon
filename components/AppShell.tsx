import Link from "next/link";
import { Dna, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AppShell({
  active,
  children,
}: {
  active: "course" | "learn" | "educator";
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh flex flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b bg-white">
        <div className="page-width flex min-h-20 flex-wrap items-center justify-between gap-3 py-4">
          <Link
            href="/"
            aria-label="Nervon home"
            className="flex items-center gap-2.5 text-xl font-semibold"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
              <Dna className="size-5" />
            </span>
            nervon
            <span className="ml-1 hidden text-xs font-normal text-muted-foreground sm:inline">
              Learning, explained.
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex gap-1 rounded-xl bg-muted/60 p-1"
          >
            {(
              [
                ["course", "/", "Course"],
                ["learn", "/learn", "Practice"],
                ["educator", "/educator", "Educator"],
              ] as const
            ).map(([id, href, label]) => (
              <Link
                key={id}
                href={href}
                aria-current={active === id ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active === id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="page-width flex-1 py-8 sm:py-12">
        {children}
      </main>
      <footer className="border-t bg-white">
        <div className="page-width flex flex-col justify-between gap-3 py-6 text-xs leading-relaxed text-muted-foreground sm:flex-row">
          <p>
            <Badge variant="outline" className="mr-2">
              Synthetic demo
            </Badge>
            Course content and AI hypotheses are pending educator review.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            Day 1 presentation <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
