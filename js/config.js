/* MavNext — deployment configuration.
   Shared accounts stay OFF until the project owner fills in BOTH values from
   their Supabase project (Settings → API). The anon key is designed to be public;
   access is controlled by the row-level security policies in supabase/schema.sql.
   NEVER put the service_role key or any other secret in this file. */
window.MAVNEXT_CONFIG = {
  supabaseUrl: '',      // e.g. 'https://abcd1234.supabase.co'
  supabaseAnonKey: ''   // the project's anon/public key
};
