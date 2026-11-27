
-- =====================================================================
-- Permissions and refresh (safe to run any time).
-- Some newer Supabase projects do not give the website access to new tables
-- automatically. This gives access; row-level security above still decides
-- what each person may see or change.
-- =====================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
-- the AI counter must stay server-only
revoke execute on function public.ai_take(uuid) from public, anon, authenticated;
grant execute on function public.ai_take(uuid) to service_role;
-- ask the Data API to see the new tables straight away
notify pgrst, 'reload schema';

-- Check: this should list 19 tables, including profiles, labs and courses.
select count(*) as club_tables_found from information_schema.tables
 where table_schema = 'public' and table_name in ('profiles','subjects','labs','news','lab_progress','exams','exam_questions','attempts','certificates','app_settings','ai_usage','courses','lessons','assignments','submissions','classes','class_members','class_posts','post_comments');
