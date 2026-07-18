import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — E-share" },
      { name: "description", content: "Sign in or create your E-share account." },
    ],
  }),
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function AuthPage() {
  const search = Route.useSearch();
  return <AuthPageContent initialMode={search.mode} />;
}

export function AuthPageContent({
  initialMode,
}: {
  initialMode?: "signin" | "signup" | "forgot";
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(initialMode ?? "signin");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/dashboard" });
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen bg-gradient-hero lg:grid-cols-2">
      {/* Left: brand */}
      <div className="relative hidden flex-col justify-between p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Cloud className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">E-share</span>
        </Link>
        <div className="max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight">
            Files that <span className="text-gradient">feel like home.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            A quiet, elegant workspace to keep everything you care about — and share it on your
            terms.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} E-share</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Cloud className="size-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">E-share</span>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-elegant backdrop-blur sm:p-8">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-3 bg-secondary">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="forgot">Reset</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-6">
                <SignInForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <SignUpForm />
              </TabsContent>
              <TabsContent value="forgot" className="mt-6">
                <ForgotForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full border-border bg-secondary/60"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/oauth/consent`,
            },
          });

          if (error) {
            toast.error("Google sign-in failed", { description: error.message });
            return;
          }

          if (data?.url) {
            window.location.assign(data.url);
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <svg viewBox="0 0 24 24" className="mr-2 size-4" aria-hidden>
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      or
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });

      if (error) {
        toast.error("Sign in failed", { description: error.message });
        return;
      }

      if (!data.session) {
        toast.error("Sign in failed", { description: "No session was created. Please try again." });
        return;
      }

      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to E-share.</p>
      <div className="mt-6">
        <GoogleButton />
      </div>
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-gradient-primary shadow-glow hover:opacity-90"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </div>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error("Sign up failed", { description: error.message });
        return;
      }

      toast.success("Check your email to confirm your account", {
        description: "Or sign in directly if confirmations are disabled.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your E-share account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Free forever for personal use.</p>
      <div className="mt-6">
        <GoogleButton />
      </div>
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email2">Email</Label>
          <Input
            id="email2"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password2">Password</Label>
          <Input
            id="password2"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-gradient-primary shadow-glow hover:opacity-90"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>
    </div>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error("Couldn't send reset email", { description: error.message });
        return;
      }

      toast.success("Check your email for a reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We'll email you a secure link to set a new password.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email3">Email</Label>
          <Input
            id="email3"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-gradient-primary shadow-glow hover:opacity-90"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>
    </div>
  );
}
