import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Its own storage key: the admin session never mixes with a Sprout app session (the app uses "sprout-auth").
export function adminClient(): SupabaseClient {
  const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createClient(url, key, { auth: { storageKey: "sprout-admin-auth", flowType: "pkce", persistSession: true, detectSessionInUrl: true } });
}
