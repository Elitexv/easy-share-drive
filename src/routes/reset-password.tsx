import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — E-share" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const initializeRecoverySession = async () => {
      setLoading(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          if (active) setReady(true);
          return;
        }

        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (!active) return;

        if (error || !data.session) {
          toast.error("This reset link is invalid or has expired", {
            description: "Please request a new password reset email.",
          });
          navigate({ to: "/auth", search: { mode: "forgot" } });
          return;
        }

        setReady(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    initializeRecoverySession();

    return () => {
      active = false;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error("Couldn't update password", { description: error.message });
        return;
      }

      toast.success("Password updated");
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 shadow-elegant backdrop-blur">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Cloud className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">E-share</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password you don't use anywhere else.
        </p>
        {!ready ? (
          <div className="mt-6 rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm text-muted-foreground">
            Verifying your password reset link...
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="np">New password</Label>
              <Input
                id="np"
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
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
