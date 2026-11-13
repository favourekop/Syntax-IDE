import { createClient } from '@supabase/supabase-js';

// Browser-safe public credentials only. Never put the service-role key in VITE_*.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function getCurrentSession() {
  if (!supabase) return { session: null, error: null };
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured. Add the public URL and anon key to your hosting environment.');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured. Add the public URL and anon key to your hosting environment.');
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}
