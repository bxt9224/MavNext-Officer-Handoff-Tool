/* MavNext — deployment configuration.
   Shared accounts stay OFF until the project owner fills in BOTH values from
   their Supabase project (Project Settings → API Keys). The anon key is designed to be public;
   access is controlled by the row-level security policies in supabase/schema.sql.
   NEVER put the service_role key or any other secret in this file. */
window.MAVNEXT_CONFIG = {
  siteUrl: 'https://rojantimalsina7-droid.github.io/Officer-Handoff-Tool/',   // published address used in invitation links
  supabaseUrl: 'https://nacpckngdzqvihufyfrd.supabase.co',
  supabaseAnonKey: 'sb_publishable_mp0NIsyHAqMiJo8Amtu8rQ_JgYIJAuA',  // publishable (or legacy anon) key — never the secret key
  emailCodes: false   // set true only after adding {{ .Token }} to the Magic link email template (needs custom SMTP)
};
