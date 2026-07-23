import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, useCurrentUserId } from "@/components/app-sidebar";
import { FileBrowser } from "@/components/file-browser";
import { StatsBento } from "@/components/stats-bento";

const searchSchema = z.object({ folder: z.string().optional() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DashboardPage,
  head: () => ({ meta: [{ title: "My files — E-share" }] }),
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

  const inRoot = folderId === null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userId={userId} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold">Dashboard</div>
              <div className="truncate text-xs text-muted-foreground">
                Welcome back — here's what's happening in your workspace.
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {inRoot && (
              <div className="border-b border-border/70 bg-gradient-hero px-4 py-6 sm:px-6">
                <StatsBento userId={userId} />
              </div>
            )}
            <FileBrowser
              userId={userId}
              scope="all"
              folderId={folderId}
              onFolderChange={setFolderId}
              title="My files"
              emptyTitle="Your E-share is empty"
              emptyBody="Drag files anywhere or click Upload to add your first file. Organize with folders as you go."
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
