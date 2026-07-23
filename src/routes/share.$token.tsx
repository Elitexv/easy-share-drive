import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Cloud,
  Download,
  Loader2,
  Lock,
  KeyRound,
  Info,
  Eye,
  Calendar,
  User as UserIcon,
  FileType2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { iconForMime, isPreviewable, isTextPreviewable } from "@/lib/file-icons";
import { formatBytes } from "@/lib/format";
import { accessShare, type ShareResolution } from "@/lib/share.functions";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
  head: () => ({
    meta: [
      { title: "Shared file — E-share" },
      { name: "description", content: "View or download a file securely shared through E-share." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Shared file — E-share" },
      { property: "og:description", content: "View or download a file securely shared through E-share." },
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
  const [copied, setCopied] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

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

  // Fetch text content when previewing text-like files
  useEffect(() => {
    if (
      info?.status === "ok" &&
      info.signed_url &&
      isTextPreviewable(info.mime_type ?? null, info.file_name ?? "")
    ) {
      setTextLoading(true);
      fetch(info.signed_url)
        .then((r) => r.text())
        .then((t) => setTextContent(t.slice(0, 200_000)))
        .catch(() => setTextContent(null))
        .finally(() => setTextLoading(false));
    }
  }, [info?.signed_url, info?.status, info?.file_name, info?.mime_type]);

  const download = async () => {
    const res = await access({
      data: { token, password: password || null, mode: "download" },
    });
    if (res.status === "ok" && res.signed_url) {
      window.open(res.signed_url, "_blank");
    } else if (res.status === "forbidden") {
      toast.error("This link does not allow downloads.");
    } else {
      toast.error("Download unavailable.");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const previewUrl =
    info?.status === "ok" && info.signed_url && isPreviewable(info.mime_type ?? null, info.file_name ?? "")
      ? info.signed_url
      : null;

  const errorMessage = useMemo(() => {
    if (!info) return null;
    if (info.status === "not_found") return "This share link is invalid or the file no longer exists.";
    if (info.status === "expired") return "This share link has expired.";
    return null;
  }, [info]);

  const needsPassword =
    info?.status === "password_required" || info?.status === "password_invalid";

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Cloud className="size-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold">E-share</span>
              <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
                Shared file
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="hidden sm:inline-flex"
            >
              {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-primary shadow-glow hover:opacity-90">
                Create your own E-share
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {loading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : errorMessage ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-elegant">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10">
              <Lock className="size-6 text-destructive" />
            </div>
            <h1 className="mt-5 font-display text-xl font-semibold">Link unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <Link to="/" className="mt-6 inline-block">
              <Button variant="outline" size="sm">
                Back to E-share
              </Button>
            </Link>
          </div>
        ) : needsPassword ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 shadow-elegant">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10">
              <KeyRound className="size-6 text-primary" />
            </div>
            <h1 className="mt-5 text-center font-display text-xl font-semibold">
              Password required
            </h1>
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
                {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
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
          <ShareView
            info={info}
            previewUrl={previewUrl}
            textContent={textContent}
            textLoading={textLoading}
            onDownload={download}
          />
        ) : null}
      </main>
    </div>
  );
}

function ShareView({
  info,
  previewUrl,
  textContent,
  textLoading,
  onDownload,
}: {
  info: ShareResolution;
  previewUrl: string | null;
  textContent: string | null;
  textLoading: boolean;
  onDownload: () => void;
}) {
  const { Icon, tone } = iconForMime(info.mime_type ?? null, info.file_name ?? "");
  const mime = info.mime_type ?? "";
  const name = info.file_name ?? "";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
      {/* File header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent">
            <Icon className={`size-6 ${tone}`} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold sm:text-xl">
              {info.file_name}
            </h1>
            <div className="mt-1 truncate text-sm text-muted-foreground">
              {formatBytes(Number(info.file_size ?? 0))}
              {info.owner_name && <> · shared by {info.owner_name}</>}
            </div>
          </div>
        </div>
        {info.permission === "download" && (
          <Button
            onClick={onDownload}
            className="shrink-0 bg-gradient-primary shadow-glow hover:opacity-90"
          >
            <Download className="mr-1.5 size-4" /> <span className="hidden sm:inline">Download</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview" className="w-full">
        <div className="border-b border-border bg-surface/50 px-4 sm:px-6">
          <TabsList className="h-11 w-auto bg-transparent p-0">
            <TabsTrigger
              value="preview"
              className="h-11 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Eye className="size-4" /> Preview
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="h-11 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Info className="size-4" /> Details
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="mt-0 p-4 sm:p-6">
          {previewUrl ? (
            mime.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt={name}
                className="mx-auto max-h-[75vh] rounded-lg border border-border object-contain"
              />
            ) : mime.startsWith("video/") ? (
              <video src={previewUrl} controls className="mx-auto max-h-[75vh] w-full rounded-lg" />
            ) : mime.startsWith("audio/") ? (
              <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface p-6">
                <audio src={previewUrl} controls className="w-full" />
              </div>
            ) : isTextPreviewable(mime, name) ? (
              textLoading ? (
                <div className="grid h-40 place-items-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : textContent !== null ? (
                <pre className="max-h-[75vh] overflow-auto rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-foreground">
                  <code>{textContent}</code>
                </pre>
              ) : (
                <NoPreview onDownload={onDownload} canDownload={info.permission === "download"} />
              )
            ) : mime === "application/pdf" || name.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={previewUrl}
                className="h-[80vh] w-full rounded-lg border border-border"
                title={name || "PDF preview"}
              />
            ) : (
              <iframe
                src={previewUrl}
                className="h-[75vh] w-full rounded-lg border border-border"
                title={name || "preview"}
              />
            )
          ) : (
            <NoPreview onDownload={onDownload} canDownload={info.permission === "download"} />
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-0 p-4 sm:p-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailRow icon={<FileType2 className="size-4" />} label="File type">
              {mime || "Unknown"}
            </DetailRow>
            <DetailRow icon={<Info className="size-4" />} label="Size">
              {formatBytes(Number(info.file_size ?? 0))}
            </DetailRow>
            <DetailRow icon={<UserIcon className="size-4" />} label="Shared by">
              {info.owner_name ?? "Unknown"}
            </DetailRow>
            <DetailRow icon={<Eye className="size-4" />} label="Permission">
              {info.permission === "download" ? "View & download" : "View only"}
            </DetailRow>
            <DetailRow icon={<Calendar className="size-4" />} label="Expires">
              {info.expires_at
                ? new Date(info.expires_at).toLocaleString()
                : "Never"}
            </DetailRow>
            <DetailRow icon={<KeyRound className="size-4" />} label="Password">
              {info.requires_password ? "Protected" : "None"}
            </DetailRow>
          </dl>
          {previewUrl && (
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-1.5 size-4" /> Open in new tab
                </Button>
              </a>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/50 p-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function NoPreview({
  onDownload,
  canDownload,
}: {
  onDownload: () => void;
  canDownload: boolean;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface p-12 text-center">
      <FileType2 className="size-10 text-muted-foreground" />
      <h3 className="mt-4 font-display text-base font-semibold">Preview not available</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        This file type can't be previewed in the browser.
        {canDownload ? " Download it to view on your device." : ""}
      </p>
      {canDownload && (
        <Button
          onClick={onDownload}
          size="sm"
          className="mt-4 bg-gradient-primary shadow-glow hover:opacity-90"
        >
          <Download className="mr-1.5 size-4" /> Download file
        </Button>
      )}
    </div>
  );
}
