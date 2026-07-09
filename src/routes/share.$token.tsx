import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cloud, Download, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { iconForMime, isPreviewable } from "@/lib/file-icons";
import { formatBytes } from "@/lib/format";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
  head: () => ({
    meta: [
      { title: "Shared file — Vault" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

interface ShareInfo {
  share_id: string;
  file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  permission: string;
  expires_at: string | null;
  owner_name: string | null;
}

function SharePage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_share_by_token", { _token: token });
      if (error) {
        setError("This share link is invalid or has expired.");
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("This share link is invalid or has expired.");
      } else {
        const row = (Array.isArray(data) ? data[0] : data) as ShareInfo;
        setInfo(row);
        if (isPreviewable(row.mime_type)) {
          const { data: signed } = await supabase.storage
            .from("files")
            .createSignedUrl(row.storage_path, 600);
          if (signed) setPreviewUrl(signed.signedUrl);
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const download = async () => {
    if (!info) return;
    const { data } = await supabase.storage
      .from("files")
      .createSignedUrl(info.storage_path, 60, { download: info.file_name });
    if (data) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Cloud className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Vault</span>
        </Link>
        <Link to="/auth">
          <Button variant="outline" size="sm" className="border-border bg-surface/60">
            Create your own vault
          </Button>
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        {loading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : error || !info ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-elegant">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10">
              <Lock className="size-6 text-destructive" />
            </div>
            <h1 className="mt-5 text-xl font-semibold">Link unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-elegant">
            <div className="flex items-start gap-4 border-b border-border p-6">
              {(() => {
                const { Icon, tone } = iconForMime(info.mime_type, info.file_name);
                return (
                  <div className="grid size-14 place-items-center rounded-xl bg-accent">
                    <Icon className={`size-6 ${tone}`} />
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold">{info.file_name}</h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(Number(info.file_size))}
                  {info.owner_name && <> · shared by {info.owner_name}</>}
                </div>
              </div>
              {info.permission === "download" && (
                <Button
                  onClick={download}
                  className="bg-gradient-primary shadow-glow hover:opacity-90"
                >
                  <Download className="mr-1.5 size-4" /> Download
                </Button>
              )}
            </div>
            <div className="p-6">
              {previewUrl ? (
                info.mime_type?.startsWith("image/") ? (
                  <img
                    src={previewUrl}
                    alt={info.file_name}
                    className="mx-auto max-h-[70vh] rounded-lg border border-border"
                  />
                ) : info.mime_type?.startsWith("video/") ? (
                  <video src={previewUrl} controls className="w-full rounded-lg" />
                ) : info.mime_type?.startsWith("audio/") ? (
                  <audio src={previewUrl} controls className="w-full" />
                ) : (
                  <iframe
                    src={previewUrl}
                    className="h-[70vh] w-full rounded-lg border border-border"
                    title={info.file_name}
                  />
                )
              ) : (
                <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
                  Preview not available for this file type.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
