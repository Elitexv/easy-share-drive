import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { toast } from "sonner";
import { describeSupabaseError } from "@/integrations/supabase/error";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  userId,
  folderId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  folderId: string | null;
}) {
  const qc = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const uploadOne = useMutation({
    mutationFn: async (item: UploadItem) => {
      const path = `${userId}/${crypto.randomUUID()}-${item.file.name}`;
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", progress: 10 } : it)),
      );
      const { error: uploadErr } = await supabase.storage
        .from("files")
        .upload(path, item.file, { contentType: item.file.type, upsert: false });
      if (uploadErr) throw uploadErr;
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, progress: 75 } : it)),
      );
      const { error: dbErr } = await supabase.from("files").insert({
        user_id: userId,
        folder_id: folderId,
        name: item.file.name,
        storage_path: path,
        size_bytes: item.file.size,
        mime_type: item.file.type || null,
      });
      if (dbErr) {
        await supabase.storage.from("files").remove([path]);
        throw dbErr;
      }
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "done", progress: 100 } : it)),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["storage-used"] });
    },
    onError: (err: Error, item) => {
      const message = describeSupabaseError(err, `Upload failed: ${item.file.name}`);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "error", error: message } : it,
        ),
      );
      toast.error(`Upload failed: ${item.file.name}`, { description: message });
    },
  });

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      if (!arr.length) return;
      const newItems: UploadItem[] = arr.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        progress: 0,
        status: "queued",
      }));
      setItems((prev) => [...prev, ...newItems]);
      // start uploads sequentially to avoid overwhelming
      (async () => {
        for (const it of newItems) {
          try {
            await uploadOne.mutateAsync(it);
          } catch {
            /* handled in onError */
          }
        }
      })();
    },
    [uploadOne],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
        </DialogHeader>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`group grid cursor-pointer place-items-center rounded-xl border-2 border-dashed p-10 text-center transition ${
            dragging
              ? "border-primary bg-primary/10"
              : "border-border bg-surface hover:bg-surface-hover"
          }`}
        >
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <div className="grid size-14 place-items-center rounded-full bg-gradient-primary shadow-glow">
            <UploadCloud className="size-6 text-primary-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">Drag files here or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Any file type. Uploads happen in the background.
          </p>
        </label>

        {items.length > 0 && (
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{it.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(it.file.size)}
                    </span>
                  </div>
                  <Progress value={it.progress} className="mt-2 h-1" />
                  {it.status === "error" && (
                    <p className="mt-1 text-xs text-destructive">{it.error}</p>
                  )}
                </div>
                {it.status === "uploading" && (
                  <Loader2 className="size-4 animate-spin text-primary" />
                )}
                {it.status === "done" && (
                  <span className="text-xs font-medium text-[oklch(0.74_0.17_155)]">Done</span>
                )}
                {it.status === "error" && (
                  <X className="size-4 text-destructive" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
