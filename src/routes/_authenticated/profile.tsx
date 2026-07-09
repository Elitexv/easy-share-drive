import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, useCurrentUserId } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Vault" }] }),
});

function ProfilePage() {
  const userId = useCurrentUserId();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: used = 0 } = useQuery({
    queryKey: ["storage-used", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_storage_used", { _user_id: userId! });
      return Number(data ?? 0);
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
    setSaving(false);
    if (error) return toast.error("Couldn't save", { description: error.message });
    toast.success("Profile updated");
  };

  if (!userId) return null;
  const quota = Number(profile?.storage_quota_bytes ?? 5 * 1024 ** 3);
  const pct = Math.min(100, (used / quota) * 100);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userId={userId} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center border-b border-border px-3">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl space-y-6">
              <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 place-items-center rounded-full bg-gradient-primary text-2xl font-semibold text-primary-foreground shadow-glow">
                    {(profile?.full_name ?? profile?.email ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-lg font-medium">{profile?.full_name}</div>
                    <div className="text-sm text-muted-foreground">{profile?.email}</div>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <Button
                    onClick={save}
                    disabled={saving}
                    className="bg-gradient-primary shadow-glow hover:opacity-90"
                  >
                    {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-base font-semibold">Storage</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(used)} used of {formatBytes(quota)}
                </p>
                <Progress value={pct} className="mt-3 h-2" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
