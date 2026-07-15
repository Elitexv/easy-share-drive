
-- Lock down SECURITY DEFINER function execution; grant only where needed.

-- Trigger-only functions: nobody should call directly
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- Public share resolution: anon + authenticated need it
REVOKE ALL ON FUNCTION public.get_share_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_share_by_token(text) TO anon, authenticated;

-- Storage usage: signed-in user checks their own quota
REVOKE ALL ON FUNCTION public.get_storage_used(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storage_used(uuid) TO authenticated;

-- Role check: used by RLS policies (internal) and admin UI (authenticated)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Admin functions: enforce admin role inside; only authenticated may call
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_shares() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_shares() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_share(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_share(uuid) TO authenticated;
