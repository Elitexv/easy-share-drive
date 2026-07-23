import { useQuery } from "@tanstack/react-query";
import { HardDrive, FileText, Star, Share2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes, formatRelative } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { iconForMime } from "@/lib/file-icons";
import { Link } from "@tanstack/react-router";

interface Props {
  userId: string;
}

export function StatsBento({ userId }: Props) {
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: used = 0 } = useQuery({
    queryKey: ["storage-used", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_storage_used", { _user_id: userId });
      return Number(data ?? 0);
    },
    refetchInterval: 5000,
  });

  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts", userId],
    queryFn: async () => {
      const [files, starred, shares] = await Promise.all([
        supabase
          .from("files")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_trashed", false),
        supabase
          .from("files")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_starred", true)
          .eq("is_trashed", false),
        supabase
          .from("shares")
          .select("id", { count: "exact", head: true })
          .eq("created_by", userId),
      ]);
      return {
        files: files.count ?? 0,
        starred: starred.count ?? 0,
        shares: shares.count ?? 0,
      };
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-files", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("files")
        .select("id,name,mime_type,size_bytes,updated_at,folder_id")
        .eq("user_id", userId)
        .eq("is_trashed", false)
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const quota = Number(profile?.storage_quota_bytes ?? 5 * 1024 ** 3);
  const pct = Math.min(100, (used / quota) * 100);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Storage — spans 2 */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-elegant sm:col-span-2 lg:col-span-2">
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-gradient-primary opacity-10 blur-2xl" />
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <HardDrive className="size-3.5" /> Storage
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-3xl font-semibold tracking-tight">
              {formatBytes(used)}
            </div>
            <div className="text-sm text-muted-foreground">of {formatBytes(quota)}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-semibold text-primary">
              {pct.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">used</div>
          </div>
        </div>
        <Progress value={pct} className="mt-4 h-2" />
      </div>

      <StatCard
        icon={<FileText className="size-4" />}
        label="Files"
        value={counts?.files ?? 0}
      />
      <StatCard
        icon={<Star className="size-4" />}
        label="Starred"
        value={counts?.starred ?? 0}
        href="/starred"
      />

      {/* Recent — full width */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant sm:col-span-2 lg:col-span-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="size-3.5" /> Recent activity
          </div>
        </div>
        {recent.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-surface/60 py-8 text-center text-sm text-muted-foreground">
            No recent files yet — upload something to get started.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recent.map((f) => {
              const { Icon, tone } = iconForMime(f.mime_type, f.name);
              return (
                <li key={f.id} className="flex items-center gap-3 py-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface">
                    <Icon className={"size-4 " + tone} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(f.size_bytes)} · {formatRelative(f.updated_at)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <StatCard
        icon={<Share2 className="size-4" />}
        label="Active shares"
        value={counts?.shares ?? 0}
        gradient
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
  gradient?: boolean;
}) {
  const inner = (
    <div
      className={
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border p-5 shadow-elegant transition hover:-translate-y-0.5 hover:shadow-glow " +
        (gradient ? "bg-gradient-primary text-primary-foreground" : "bg-card")
      }
    >
      <div
        className={
          "flex items-center gap-2 text-xs font-medium uppercase tracking-wider " +
          (gradient ? "text-primary-foreground/80" : "text-muted-foreground")
        }
      >
        {icon}
        {label}
      </div>
      <div className="mt-6 font-display text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}
