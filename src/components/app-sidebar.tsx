import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cloud,
  HardDrive,
  Star,
  Trash2,
  User as UserIcon,
  LogOut,
  Loader2,
  Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const items = [
  { title: "My files", url: "/dashboard", icon: HardDrive },
  { title: "Starred", url: "/starred", icon: Star },
  { title: "Trash", url: "/trash", icon: Trash2 },
  { title: "Profile", url: "/profile", icon: UserIcon },
];

export function AppSidebar({ userId }: { userId: string }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [signingOut, setSigningOut] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: storageUsed = 0 } = useQuery({
    queryKey: ["storage-used", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_storage_used", { _user_id: userId });
      return Number(data ?? 0);
    },
    refetchInterval: 5000,
  });

  const quota = Number(profile?.storage_quota_bytes ?? 5 * 1024 ** 3);
  const pct = Math.min(100, (storageUsed / quota) * 100);

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Cloud className="size-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Vault
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="space-y-3 p-2 group-data-[collapsible=icon]:hidden">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-sidebar-foreground">Storage</span>
              <span className="text-muted-foreground">
                {formatBytes(storageUsed)} / {formatBytes(quota)}
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {(profile?.full_name ?? profile?.email ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {profile?.full_name ?? "Signed in"}
              </div>
              <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={signOut}
              disabled={signingOut}
              aria-label="Sign out"
              className="size-8"
            >
              {signingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function useCurrentUserId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setId(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (id === null) {
      // no-op; parent route gate handles redirects
    }
  }, [id]);
  return id;
}

export function signOutAndRedirect() {
  supabase.auth.signOut().then(() => {
    toast.success("Signed out");
    window.location.href = "/auth";
  });
}
