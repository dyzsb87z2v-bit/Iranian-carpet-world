-- Trigger functions must not be callable through the REST API (/rpc).
-- is_admin() and my_seller_id() stay executable: RLS policies call them,
-- and they only reveal facts about the caller.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_product_update() from public, anon, authenticated;
revoke execute on function public.guard_privileged_columns() from public, anon, authenticated;
revoke execute on function public.promote_seller_owner() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
