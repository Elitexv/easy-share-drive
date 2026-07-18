import { createFileRoute, Link } from "@tanstack/react-router";
import { Cloud, Lock, Share2, Upload, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "E-share — Secure file sharing, beautifully done" },
      {
        name: "description",
        content:
          "A modern workspace to upload, organize, and share files with link-based access. Dark-first, fast, and secure.",
      },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Cloud className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">E-share</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button size="sm" className="bg-gradient-primary shadow-glow hover:opacity-90">
              Get started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 text-center sm:pt-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-primary" />
          A new home for your files
        </div>
        <h1 className="mt-8 text-5xl font-semibold tracking-tight sm:text-7xl">
          Your files, <span className="text-gradient">beautifully organized</span> and{" "}
          securely shared.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Drag, drop, and share in seconds. E-share is a dark-first workspace built for teams and
          creators who care about how things look — and how safely they travel.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
              Get started with E-share <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="border-border bg-surface/50">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            Icon: Upload,
            title: "Drag-and-drop uploads",
            body: "Any file, any size. Live progress with graceful failure handling.",
          },
          {
            Icon: Share2,
            title: "Secure share links",
            body: "Generate view or download links. Copy in one click, revoke anytime.",
          },
          {
            Icon: Lock,
            title: "Private by default",
            body: "Row-level security scopes every file to its owner. Zero surprises.",
          },
        ].map(({ Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur transition hover:bg-surface-hover"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-accent">
              <Icon className="size-5 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Built with E-share · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
