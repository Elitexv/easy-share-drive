import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelative, randomToken } from "@/lib/format";

interface Props {
  fileId: string;
  fileName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ShareDialog({ fileId, fileName, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [permission, setPermission] = useState<"view" | "download">("download");
  const [expiresDays, setExpiresDays] = useState<string>("never");
  const [password, setPassword] = useState<string>("");

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["shares", fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shares")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createShare = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      let expiresAt: string | null = null;
      if (expiresDays !== "never") {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(expiresDays));
        expiresAt = d.toISOString();
      }
      const token = randomToken(24);
      const { data: inserted, error } = await supabase
        .from("shares")
        .insert({
          file_id: fileId,
          created_by: user.id,
          token,
          permission,
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (password.length > 0 && inserted) {
        const { error: pwErr } = await supabase.rpc("set_share_password", {
          _share_id: inserted.id,
          _password: password,
        });
        if (pwErr) throw pwErr;
      }
      setPassword("");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shares", fileId] });
      toast.success("Share link created");
    },
    onError: (err: Error) => toast.error("Couldn't create link", { description: err.message }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shares").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shares", fileId] });
      toast.success("Link revoked");
    },
  });

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share "{fileName}"</DialogTitle>
          <DialogDescription>
            Anyone with the link can access this file according to the permission you choose.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label>Permission</Label>
            <Select value={permission} onValueChange={(v) => setPermission(v as "view" | "download")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View only</SelectItem>
                <SelectItem value="download">Allow download</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expires</Label>
            <Select value={expiresDays} onValueChange={setExpiresDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="1">In 1 day</SelectItem>
                <SelectItem value="7">In 7 days</SelectItem>
                <SelectItem value="30">In 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => createShare.mutate()}
            disabled={createShare.isPending}
            className="self-end bg-gradient-primary shadow-glow hover:opacity-90"
          >
            {createShare.isPending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Link2 className="mr-1 size-4" />
            )}
            Create link
          </Button>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Active links
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : shares.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No share links yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {shares.map((s) => {
                const url = shareUrl(s.token);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 pl-3"
                  >
                    <Input readOnly value={url} className="h-8 flex-1 bg-background text-xs" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        toast.success("Link copied");
                      }}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => revoke.mutate(s.id)}
                      aria-label="Revoke"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                    <div className="hidden text-xs text-muted-foreground sm:block">
                      {s.permission} ·{" "}
                      {s.expires_at ? `until ${formatRelative(s.expires_at)}` : "no expiry"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
