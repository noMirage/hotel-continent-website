-- Notifies the public site (apps/site → POST /api/revalidate) whenever the admin panel
-- changes public content, so prices / rooms / promotions on the site update right away.
--
-- Environment-specific (URL + secret), so it is not a migration. Run once per database:
--
--   psql "$DB_URL" -v site_url='https://hotel-continent.com' -v secret="$REVALIDATE_SECRET" \
--        -f supabase/webhooks/revalidate-site.sql
--
-- `secret` must equal REVALIDATE_SECRET of the site's Vercel project. Re-running replaces
-- the previous URL/secret. Statement-level triggers: one request per admin save, not per row.
-- Requires the pg_net extension (Dashboard → Database → Extensions, or the line below).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

\o /dev/null
SELECT set_config('revalidate.url', :'site_url' || '/api/revalidate', false),
       set_config('revalidate.secret', :'secret', false);
\o

DO $do$
BEGIN
  EXECUTE format($fn$
    CREATE OR REPLACE FUNCTION public.notify_site_revalidate()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions
    AS $body$
    BEGIN
      PERFORM net.http_post(
        url     := %L,
        body    := jsonb_build_object('table', TG_TABLE_NAME, 'type', TG_OP),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', %L)
      );
      RETURN NULL;
    END
    $body$;
  $fn$, current_setting('revalidate.url'), current_setting('revalidate.secret'));
END
$do$;

REVOKE ALL ON FUNCTION public.notify_site_revalidate() FROM PUBLIC;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['room_types', 'room_type_guest_prices', 'room_media', 'room_units', 'hotel_settings', 'promotions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS site_revalidate ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER site_revalidate AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH STATEMENT EXECUTE FUNCTION public.notify_site_revalidate()', t);
  END LOOP;
END
$$;

-- To remove:
--   DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['room_types','room_type_guest_prices','room_media','room_units','hotel_settings','promotions']
--   LOOP EXECUTE format('DROP TRIGGER IF EXISTS site_revalidate ON public.%I', t); END LOOP; END $$;
--   DROP FUNCTION IF EXISTS public.notify_site_revalidate();
