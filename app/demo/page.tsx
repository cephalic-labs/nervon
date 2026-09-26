import Link from "next/link";
import { Dna, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
export default function DemoPage() {
  return (
    <main className="demo-stage">
      <article className="demo-slide">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-5">
          <span className="flex items-center gap-2 text-xl font-semibold">
            <Dna className="size-6" />
            nervon
          </span>
          <span className="text-xs text-white/75">
            Builders Pitch Fest · EdTech AI · Day 1
          </span>
        </header>
        <div className="my-8">
          <p className="text-xs font-semibold tracking-widest text-[#c2dfcf]">
            ACADEMIC PROGRESS & LEARNING OUTCOMES
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
            A score shows what went wrong.
            <br />
            An explanation shows where to help.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">
            Students need a focused next step. Educators need to see recurring
            reasoning gaps without inspecting every answer individually.
          </p>
        </div>
        <section
          aria-label="Solution loop"
          className="grid gap-4 border-y border-white/20 py-6 sm:grid-cols-4"
        >
          {[
            ["01", "Explain", "Answer a genetics question in your own words."],
            [
              "02",
              "Diagnose",
              "Jev proposes a rubric-based reasoning pattern.",
            ],
            ["03", "Coach", "DeepSeek gives feedback from course sources."],
            ["04", "Check", "A different question updates the session."],
          ].map(([n, title, text]) => (
            <div key={n}>
              <p className="text-xs text-[#c2dfcf]">{n}</p>
              <h2 className="mt-2 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/80">{text}</p>
            </div>
          ))}
        </section>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold text-[#c2dfcf]">
              Working today
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/85">
              3 Classical Genetics concepts · 6 questions · source-grounded
              feedback · honest review states · local educator view.
            </p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-[#c2dfcf]">
              Validate next
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Faculty-label consented examples. Test unseen questions, per-label
              errors and later recall before claiming learning impact.
            </p>
          </section>
        </div>
        <footer className="mt-6 border-t border-white/20 pt-4 text-xs leading-5 text-white/75">
          Synthetic course, student inputs and cohort illustration. AI diagnoses
          are hypotheses, pending educator review. OpenStax Biology 2e sources;
          no LMS integration. Live generative fallback is disclosed.
        </footer>
      </article>
      <nav
        aria-label="Presentation controls"
        className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground"
      >
        <p>One slide · Print landscape or save as PDF using your browser.</p>
        <Link href="/learn" className={buttonVariants({ variant: "outline" })}>
          Open the live demo
          <ArrowRight />
        </Link>
      </nav>
    </main>
  );
}
