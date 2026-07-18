import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, useCurrentUserId } from "@/components/app-sidebar";
import { FileBrowser } from "@/components/file-browser";

export const Route = createFileRoute("/_authenticated/starred")({
  component: StarredPage,
  head: () => ({ meta: [{ title: "Starred — E-share" }] }),
});

function StarredPage() {
  const userId = useCurrentUserId();
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
              scope="starred"
              folderId={null}
              onFolderChange={() => {}}
              title="Starred"
              emptyTitle="No starred files"
              emptyBody="Star the files you use most so you can find them here in a flash."
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
