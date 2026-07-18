import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Files as FilesIcon,
  Share2,
  HardDrive,
  Trash2,
  Search,
  Loader2,
  Shield,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, useCurrentUserId } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — E-share" }] }),
});

function AdminPage() {
  const userId = useCurrentUserId();
  if (!userId) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userId={userId} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b border-border px-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <span className="text-sm font-medium">Admin Panel</span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
                <p className="text-sm text-muted-foreground">
                  Monitor users, storage, and manage shared files.
                </p>
              </div>

              <OverviewCards />

              <Tabs defaultValue="users">
                <TabsList>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="shares">Shared files</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="mt-4">
                  <UsersTable />
                </TabsContent>
                <TabsContent value="shares" className="mt-4">
                  <SharesTable />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function OverviewCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const cards = [
    { label: "Users", value: data?.total_users ?? 0, icon: Users },
    { label: "Files", value: data?.total_files ?? 0, icon: FilesIcon },
    { label: "Active shares", value: data?.total_shares ?? 0, icon: Share2 },
    {
      label: "Total storage",
      value: formatBytes(Number(data?.total_storage_bytes ?? 0)),
      icon: HardDrive,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
            </span>
            <c.icon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {isLoading ? <Loader2 className="size-5 animate-spin" /> : String(c.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTable() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role", {
        _user_id: userId,
        _role: "admin",
        _grant: !isAdmin,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error("Couldn't update role", { description: e.message }),
  });

  const filtered = data.filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (u.email ?? "").toLowerCase().includes(s) ||
      (u.full_name ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users…"
          className="pl-9"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead className="hidden md:table-cell">Files</TableHead>
              <TableHead className="hidden md:table-cell">Shares</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const used = Number(u.storage_used_bytes ?? 0);
                const quota = Number(u.storage_quota_bytes ?? 5 * 1024 ** 3);
                const pct = Math.min(100, (used / quota) * 100);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                          {(u.full_name ?? u.email ?? "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {u.full_name ?? "—"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-40">
                      <div className="text-xs text-muted-foreground">
                        {formatBytes(used)} / {formatBytes(quota)}
                      </div>
                      <Progress value={pct} className="mt-1.5 h-1.5" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">
                      {Number(u.file_count ?? 0)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">
                      {Number(u.share_count ?? 0)}
                    </TableCell>
                    <TableCell>
                      {u.is_admin ? (
                        <Badge className="bg-gradient-primary shadow-glow">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleAdmin.isPending}
                        onClick={() =>
                          toggleAdmin.mutate({ userId: u.id, isAdmin: !!u.is_admin })
                        }
                      >
                        {u.is_admin ? "Revoke admin" : "Make admin"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SharesTable() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-shares"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_shares");
      if (error) throw error;
      return data ?? [];
    },
  });

  const revoke = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase.rpc("admin_delete_share", { _share_id: shareId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Share revoked");
      qc.invalidateQueries({ queryKey: ["admin-shares"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error("Couldn't revoke", { description: e.message }),
  });

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead className="hidden md:table-cell">Owner</TableHead>
            <TableHead>Permission</TableHead>
            <TableHead className="hidden md:table-cell">Views</TableHead>
            <TableHead className="hidden lg:table-cell">Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                No shared files yet.
              </TableCell>
            </TableRow>
          ) : (
            data.map((s) => (
              <TableRow key={s.share_id}>
                <TableCell>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(Number(s.file_size ?? 0))}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{s.owner_name ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.owner_email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {s.permission}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">
                  {s.view_count}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {s.expires_at
                    ? new Date(s.expires_at).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(s.token)}>
                      Copy link
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke this share?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The public link will stop working immediately. The file itself
                            is not deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revoke.mutate(s.share_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
