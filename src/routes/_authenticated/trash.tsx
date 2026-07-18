import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, useCurrentUserId } from "@/components/app-sidebar";
import { FileBrowser } from "@/components/file-browser";

export const Route = createFileRoute("/_authenticated/trash")({
  component: TrashPage,
  head: () => ({ meta: [{ title: "Trash — E-share" }] }),
});

function TrashPage() {
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
              scope="trash"
              folderId={null}
              onFolderChange={() => {}}
              title="Trash"
              emptyTitle="Trash is empty"
              emptyBody="Items you delete land here first. Restore them anytime, or delete forever."
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
