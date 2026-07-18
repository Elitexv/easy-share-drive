import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      const { data: refreshedSessionData, error: refreshedSessionError } = await supabase.auth.refreshSession();
      if (refreshedSessionError || !refreshedSessionData.session) {
        throw redirect({ to: "/auth" });
      }
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const { data: refreshedData, error: refreshedError } = await supabase.auth.refreshSession();
      if (refreshedError || !refreshedData.session) {
        throw redirect({ to: "/auth" });
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw redirect({ to: "/auth" });

      return { user: userData.user };
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
