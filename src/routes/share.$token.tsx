import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cloud, Download, Loader2, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iconForMime, isPreviewable } from "@/lib/file-icons";
import { formatBytes } from "@/lib/format";
import { accessShare, type ShareResolution } from "@/lib/share.functions";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
  head: () => ({
    meta: [
      { title: "Shared file — Vault" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SharePage() {
  const { token } = Route.useParams();
  const access = useServerFn(accessShare);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ShareResolution | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const load = async (pw?: string) => {
    setSubmitting(!!pw);
    try {
      const res = await access({ data: { token, password: pw ?? null, mode: "view" } });
      setInfo(res);
      if (pw && res.status === "password_invalid") {
        setPasswordError("Incorrect password");
      } else {
        setPasswordError(null);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const download = async () => {
    const res = await access({
      data: { token, password: password || null, mode: "download" },
    });
    if (res.status === "ok" && res.signed_url) {
      window.open(res.signed_url, "_blank");
    } else if (res.status === "forbidden") {
      setPasswordError("This link does not allow downloads.");
    } else {
      setPasswordError("Download unavailable.");
    }
  };

  const previewUrl =
    info?.status === "ok" && info.signed_url && isPreviewable(info.mime_type ?? null)
      ? info.signed_url
      : null;

  const errorMessage = (() => {
    if (!info) return null;
    if (info.status === "not_found") return "This share link is invalid.";
    if (info.status === "expired") return "This share link has expired.";
    return null;
  })();

  const needsPassword =
    info?.status === "password_required" || info?.status === "password_invalid";

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
        ) : errorMessage ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-elegant">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10">
              <Lock className="size-6 text-destructive" />
            </div>
            <h1 className="mt-5 text-xl font-semibold">Link unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        ) : needsPassword ? (
          <div className="rounded-2xl border border-border bg-card p-10 shadow-elegant">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10">
              <KeyRound className="size-6 text-primary" />
            </div>
            <h1 className="mt-5 text-center text-xl font-semibold">Password required</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter the password to access {info?.file_name ? `"${info.file_name}"` : "this file"}.
            </p>
            <form
              className="mx-auto mt-6 max-w-sm space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void load(password);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="share-password">Password</Label>
                <Input
                  id="share-password"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={submitting || password.length === 0}
                className="w-full bg-gradient-primary shadow-glow hover:opacity-90"
              >
                {submitting ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                Unlock
              </Button>
            </form>
          </div>
        ) : info && info.status === "ok" ? (
          <div className="rounded-2xl border border-border bg-card shadow-elegant">
            <div className="flex items-start gap-4 border-b border-border p-6">
              {(() => {
                const { Icon, tone } = iconForMime(info.mime_type ?? null, info.file_name ?? "");
                return (
                  <div className="grid size-14 place-items-center rounded-xl bg-accent">
                    <Icon className={`size-6 ${tone}`} />
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold">{info.file_name}</h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(Number(info.file_size ?? 0))}
                  {info.owner_name && <> · shared by {info.owner_name}</>}
                </div>
                {passwordError && (
                  <p className="mt-1 text-xs text-destructive">{passwordError}</p>
                )}
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
                    alt={info.file_name ?? ""}
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
                    title={info.file_name ?? "preview"}
                  />
                )
              ) : (
                <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
                  Preview not available for this file type.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
