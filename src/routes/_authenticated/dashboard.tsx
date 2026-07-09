import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, useCurrentUserId } from "@/components/app-sidebar";
import { FileBrowser } from "@/components/file-browser";

const searchSchema = z.object({ folder: z.string().optional() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DashboardPage,
  head: () => ({ meta: [{ title: "My files — Vault" }] }),
});

function DashboardPage() {
  const userId = useCurrentUserId();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [folderId, setFolderIdLocal] = useState<string | null>(search.folder ?? null);

  const setFolderId = (id: string | null) => {
    setFolderIdLocal(id);
    navigate({ search: id ? { folder: id } : {} });
  };

  if (!userId) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userId={userId} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center border-b border-border px-3">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-hidden">
            <FileBrowser
              userId={userId}
              scope="all"
              folderId={folderId}
              onFolderChange={setFolderId}
              title="My files"
              emptyTitle="Your vault is empty"
              emptyBody="Drag files anywhere or click Upload to add your first file. Organize with folders as you go."
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
