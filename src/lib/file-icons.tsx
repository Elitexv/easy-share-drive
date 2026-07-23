import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileType,
  File as FileIcon,
  type LucideIcon,
} from "lucide-react";

export function iconForMime(mime: string | null | undefined, name?: string): {
  Icon: LucideIcon;
  tone: string;
} {
  const m = (mime || "").toLowerCase();
  const ext = (name || "").split(".").pop()?.toLowerCase() ?? "";

  if (m.startsWith("image/")) return { Icon: FileImage, tone: "text-[oklch(0.78_0.16_75)]" };
  if (m.startsWith("video/")) return { Icon: FileVideo, tone: "text-[oklch(0.7_0.22_25)]" };
  if (m.startsWith("audio/")) return { Icon: FileAudio, tone: "text-[oklch(0.75_0.18_155)]" };
  if (m === "application/pdf" || ext === "pdf")
    return { Icon: FileType, tone: "text-[oklch(0.65_0.22_25)]" };
  if (
    ["zip", "rar", "7z", "tar", "gz"].includes(ext) ||
    m.includes("zip") ||
    m.includes("compressed")
  )
    return { Icon: FileArchive, tone: "text-[oklch(0.78_0.14_50)]" };
  if (["js", "ts", "tsx", "jsx", "py", "go", "rs", "html", "css", "json"].includes(ext))
    return { Icon: FileCode, tone: "text-[oklch(0.75_0.18_210)]" };
  if (["csv", "xls", "xlsx"].includes(ext))
    return { Icon: FileSpreadsheet, tone: "text-[oklch(0.72_0.18_155)]" };
  if (m.startsWith("text/") || ["md", "txt", "doc", "docx"].includes(ext))
    return { Icon: FileText, tone: "text-[oklch(0.75_0.05_260)]" };
  return { Icon: FileIcon, tone: "text-muted-foreground" };
}

export function isPreviewable(mime: string | null | undefined, name?: string): boolean {
  const m = (mime || "").toLowerCase();
  const ext = (name || "").split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("image/")) return true;
  if (m.startsWith("video/")) return true;
  if (m.startsWith("audio/")) return true;
  if (m === "application/pdf" || ext === "pdf") return true;
  if (m.startsWith("text/")) return true;
  if (
    ["md", "txt", "json", "csv", "log", "js", "ts", "tsx", "jsx", "py", "go", "rs", "html", "css", "yml", "yaml", "xml", "svg"].includes(ext)
  ) {
    return true;
  }
  return false;
}

export function isTextPreviewable(mime: string | null | undefined, name?: string): boolean {
  const m = (mime || "").toLowerCase();
  const ext = (name || "").split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("text/")) return true;
  return ["md", "txt", "json", "csv", "log", "js", "ts", "tsx", "jsx", "py", "go", "rs", "html", "css", "yml", "yaml", "xml"].includes(ext);
}

