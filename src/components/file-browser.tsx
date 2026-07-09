import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Download,
  Eye,
  Folder as FolderIcon,
  FolderPlus,
  Grid3x3,
  List,
  MoreHorizontal,
  Pencil,
  Search,
  Share2,
  Star,
  Trash2,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDialog } from "./upload-dialog";
import { ShareDialog } from "./share-dialog";
import { iconForMime, isPreviewable } from "@/lib/file-icons";
import { formatBytes, formatRelative } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ViewMode = "grid" | "list";
type SortKey = "name" | "date" | "size" | "type";

export type Scope = "all" | "starred" | "trash";

interface FileRow {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string | null;
  storage_path: string;
  is_starred: boolean;
  is_trashed: boolean;
  folder_id: string | null;
  updated_at: string;
  created_at: string;
}
interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  is_trashed: boolean;
  updated_at: string;
}

export function FileBrowser({
  userId,
  scope,
  folderId,
  onFolderChange,
  title,
  emptyTitle,
  emptyBody,
}: {
  userId: string;
  scope: Scope;
  folderId: string | null;
  onFolderChange: (id: string | null) => void;
  title: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("date");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<
    { kind: "file" | "folder"; id: string; name: string } | null
  >(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: folder } = useQuery({
    queryKey: ["folder", folderId],
    queryFn: async () => {
      if (!folderId) return null;
      const { data } = await supabase
        .from("folders")
        .select("*")
        .eq("id", folderId)
        .maybeSingle();
      return data;
    },
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["files", userId, scope, folderId],
    queryFn: async () => {
      let q = supabase.from("files").select("*").eq("user_id", userId);
      if (scope === "trash") q = q.eq("is_trashed", true);
      else q = q.eq("is_trashed", false);
      if (scope === "starred") q = q.eq("is_starred", true);
      if (scope === "all") {
        if (folderId) q = q.eq("folder_id", folderId);
        else q = q.is("folder_id", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FileRow[];
    },
  });

  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["folders", userId, scope, folderId],
    queryFn: async () => {
      let q = supabase.from("folders").select("*").eq("user_id", userId);
      if (scope === "trash") q = q.eq("is_trashed", true);
      else q = q.eq("is_trashed", false);
      if (scope === "all") {
        if (folderId) q = q.eq("parent_id", folderId);
        else q = q.is("parent_id", null);
      } else {
        // starred/trash: show folders only in trash scope
        if (scope !== "trash") return [];
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FolderRow[];
    },
  });

  const sortedFiles = useMemo(() => {
    let arr = [...(files ?? [])];
    if (search) arr = arr.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
    switch (sort) {
      case "name":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "size":
        arr.sort((a, b) => b.size_bytes - a.size_bytes);
        break;
      case "type":
        arr.sort((a, b) => (a.mime_type ?? "").localeCompare(b.mime_type ?? ""));
        break;
      default:
        arr.sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
    }
    return arr;
  }, [files, search, sort]);

  const sortedFolders = useMemo(() => {
    let arr = [...(folders ?? [])];
    if (search) arr = arr.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [folders, search]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["files"] });
    qc.invalidateQueries({ queryKey: ["folders"] });
    qc.invalidateQueries({ queryKey: ["storage-used"] });
  };

  const toggleStar = useMutation({
    mutationFn: async (f: FileRow) => {
      const { error } = await supabase
        .from("files")
        .update({ is_starred: !f.is_starred })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const trashFile = useMutation({
    mutationFn: async (f: FileRow) => {
      const { error } = await supabase
        .from("files")
        .update({ is_trashed: true, trashed_at: new Date().toISOString() })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Moved to trash");
    },
  });

  const restoreFile = useMutation({
    mutationFn: async (f: FileRow) => {
      const { error } = await supabase
        .from("files")
        .update({ is_trashed: false, trashed_at: null })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Restored");
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (f: FileRow) => {
      await supabase.storage.from("files").remove([f.storage_path]);
      const { error } = await supabase.from("files").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Deleted forever");
    },
  });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("folders").insert({
        user_id: userId,
        parent_id: folderId,
        name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Folder created");
      setNewFolderOpen(false);
      setNewFolderName("");
    },
  });

  const renameMut = useMutation({
    mutationFn: async () => {
      if (!renameTarget) return;
      const table = renameTarget.kind === "file" ? "files" : "folders";
      const { error } = await supabase
        .from(table)
        .update({ name: renameValue })
        .eq("id", renameTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Renamed");
      setRenameTarget(null);
    },
  });

  const trashFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("folders")
        .update({ is_trashed: true, trashed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Folder moved to trash");
    },
  });

  const downloadFile = async (f: FileRow) => {
    const { data, error } = await supabase.storage
      .from("files")
      .createSignedUrl(f.storage_path, 60, { download: f.name });
    if (error || !data) return toast.error("Couldn't create download link");
    window.open(data.signedUrl, "_blank");
  };

  const openPreview = async (f: FileRow) => {
    if (!isPreviewable(f.mime_type)) return downloadFile(f);
    const { data } = await supabase.storage.from("files").createSignedUrl(f.storage_path, 300);
    if (!data) return toast.error("Couldn't preview file");
    setPreviewFile(f);
    setPreviewUrl(data.signedUrl);
  };

  const empty = !filesLoading && !foldersLoading && sortedFiles.length === 0 && sortedFolders.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {scope === "all" && folderId && (
            <>
              <button
                onClick={() => onFolderChange(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                My files
              </button>
              <ChevronRight className="size-3 text-muted-foreground" />
              <span className="truncate font-medium">{folder?.name ?? "Folder"}</span>
            </>
          )}
          {(scope !== "all" || !folderId) && (
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Recent</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="type">Type</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            onClick={() => setView("grid")}
            className={`p-2 ${view === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-hover"}`}
            aria-label="Grid view"
          >
            <Grid3x3 className="size-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 ${view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-hover"}`}
            aria-label="List view"
          >
            <List className="size-4" />
          </button>
        </div>
        {scope === "all" && (
          <>
            <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="mr-1.5 size-4" /> Folder
            </Button>
            <Button
              onClick={() => setUploadOpen(true)}
              className="bg-gradient-primary shadow-glow hover:opacity-90"
            >
              <UploadCloud className="mr-1.5 size-4" /> Upload
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filesLoading || foldersLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : empty ? (
          <EmptyState title={emptyTitle} body={emptyBody} onUpload={() => setUploadOpen(true)} showUpload={scope === "all"} />
        ) : view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedFolders.map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                onOpen={() => scope === "all" && onFolderChange(f.id)}
                onRename={() => {
                  setRenameTarget({ kind: "folder", id: f.id, name: f.name });
                  setRenameValue(f.name);
                }}
                onTrash={() => trashFolder.mutate(f.id)}
                scope={scope}
              />
            ))}
            {sortedFiles.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                scope={scope}
                onOpen={() => openPreview(f)}
                onDownload={() => downloadFile(f)}
                onShare={() => setShareTarget({ id: f.id, name: f.name })}
                onStar={() => toggleStar.mutate(f)}
                onTrash={() => trashFile.mutate(f)}
                onRestore={() => restoreFile.mutate(f)}
                onDelete={() => deleteFile.mutate(f)}
                onRename={() => {
                  setRenameTarget({ kind: "file", id: f.id, name: f.name });
                  setRenameValue(f.name);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Size</th>
                  <th className="px-4 py-2 text-left font-medium">Modified</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedFolders.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => scope === "all" && onFolderChange(f.id)}
                        className="flex items-center gap-2 font-medium"
                      >
                        <FolderIcon className="size-4 text-primary" />
                        {f.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelative(f.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => trashFolder.mutate(f.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {sortedFiles.map((f) => {
                  const { Icon, tone } = iconForMime(f.mime_type, f.name);
                  return (
                    <tr key={f.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openPreview(f)}
                          className="flex items-center gap-2 text-left"
                        >
                          <Icon className={`size-4 ${tone}`} />
                          <span className="font-medium">{f.name}</span>
                          {f.is_starred && (
                            <Star className="size-3 fill-[oklch(0.82_0.15_75)] text-[oklch(0.82_0.15_75)]" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatBytes(f.size_bytes)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRelative(f.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FileMenu
                          file={f}
                          scope={scope}
                          onShare={() => setShareTarget({ id: f.id, name: f.name })}
                          onDownload={() => downloadFile(f)}
                          onStar={() => toggleStar.mutate(f)}
                          onRename={() => {
                            setRenameTarget({ kind: "file", id: f.id, name: f.name });
                            setRenameValue(f.name);
                          }}
                          onTrash={() => trashFile.mutate(f)}
                          onRestore={() => restoreFile.mutate(f)}
                          onDelete={() => deleteFile.mutate(f)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        userId={userId}
        folderId={folderId}
      />
      {shareTarget && (
        <ShareDialog
          fileId={shareTarget.id}
          fileName={shareTarget.name}
          open={!!shareTarget}
          onOpenChange={(v) => !v && setShareTarget(null)}
        />
      )}

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Untitled folder"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => newFolderName.trim() && createFolder.mutate(newFolderName.trim())}
              disabled={!newFolderName.trim() || createFolder.isPending}
              className="bg-gradient-primary shadow-glow hover:opacity-90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(v) => !v && setRenameTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => renameValue.trim() && renameMut.mutate()}
              disabled={!renameValue.trim() || renameMut.isPending}
              className="bg-gradient-primary shadow-glow hover:opacity-90"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewFile}
        onOpenChange={(v) => {
          if (!v) {
            setPreviewFile(null);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && previewUrl && (
            <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-background">
              {previewFile.mime_type?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={previewFile.name} className="mx-auto max-h-[70vh]" />
              ) : previewFile.mime_type?.startsWith("video/") ? (
                <video src={previewUrl} controls className="w-full" />
              ) : previewFile.mime_type?.startsWith("audio/") ? (
                <audio src={previewUrl} controls className="w-full p-4" />
              ) : (
                <iframe src={previewUrl} className="h-[70vh] w-full" title={previewFile.name} />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => previewFile && downloadFile(previewFile)}>
              <Download className="mr-1.5 size-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderCard({
  folder,
  onOpen,
  onRename,
  onTrash,
  scope,
}: {
  folder: FolderRow;
  onOpen: () => void;
  onRename: () => void;
  onTrash: () => void;
  scope: Scope;
}) {
  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-hover">
      <button onClick={onOpen} className="flex items-center gap-3 text-left">
        <div className="grid size-10 place-items-center rounded-lg bg-accent">
          <FolderIcon className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium">{folder.name}</div>
          <div className="text-xs text-muted-foreground">Folder</div>
        </div>
      </button>
      {scope === "all" && (
        <div className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-7">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="mr-2 size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTrash} className="text-destructive">
                <Trash2 className="mr-2 size-4" /> Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function FileCard({
  file,
  scope,
  onOpen,
  onDownload,
  onShare,
  onStar,
  onTrash,
  onRestore,
  onDelete,
  onRename,
}: {
  file: FileRow;
  scope: Scope;
  onOpen: () => void;
  onDownload: () => void;
  onShare: () => void;
  onStar: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const { Icon, tone } = iconForMime(file.mime_type, file.name);
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:bg-surface-hover">
      <button
        onClick={onOpen}
        className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-accent/30 to-surface"
      >
        <Icon className={`size-10 ${tone}`} />
      </button>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="truncate text-sm font-medium">{file.name}</div>
            {file.is_starred && (
              <Star className="size-3 shrink-0 fill-[oklch(0.82_0.15_75)] text-[oklch(0.82_0.15_75)]" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatBytes(file.size_bytes)} · {formatRelative(file.updated_at)}
          </div>
        </div>
        <FileMenu
          file={file}
          scope={scope}
          onShare={onShare}
          onDownload={onDownload}
          onStar={onStar}
          onRename={onRename}
          onTrash={onTrash}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function FileMenu({
  file,
  scope,
  onShare,
  onDownload,
  onStar,
  onRename,
  onTrash,
  onRestore,
  onDelete,
}: {
  file: FileRow;
  scope: Scope;
  onShare: () => void;
  onDownload: () => void;
  onStar: () => void;
  onRename: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-7">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {scope !== "trash" && (
          <>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 size-4" /> Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="mr-2 size-4" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStar}>
              <Star className="mr-2 size-4" />
              {file.is_starred ? "Unstar" : "Star"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onTrash} className="text-destructive">
              <Trash2 className="mr-2 size-4" /> Move to trash
            </DropdownMenuItem>
          </>
        )}
        {scope === "trash" && (
          <>
            <DropdownMenuItem onClick={onRestore}>
              <Undo2 className="mr-2 size-4" /> Restore
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 size-4" /> Delete forever
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({
  title,
  body,
  onUpload,
  showUpload,
}: {
  title: string;
  body: string;
  onUpload: () => void;
  showUpload: boolean;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface/40 p-16 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
        <UploadCloud className="size-7 text-primary-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {showUpload && (
        <Button
          onClick={onUpload}
          className="mt-6 bg-gradient-primary shadow-glow hover:opacity-90"
        >
          <UploadCloud className="mr-1.5 size-4" /> Upload files
        </Button>
      )}
    </div>
  );
}
