import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const adminSupabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const devPhoneKey = "ruvie-admin-dev-phone";

export function getDevAdminPhone() {
  return import.meta.env.DEV ? sessionStorage.getItem(devPhoneKey) : null;
}

export function setDevAdminPhone(phone: string | null) {
  if (!import.meta.env.DEV) return;
  if (phone) sessionStorage.setItem(devPhoneKey, phone);
  else sessionStorage.removeItem(devPhoneKey);
}

export async function getAdminAuthorization() {
  const { data } = await adminSupabase.auth.getSession();
  if (data.session?.access_token) return `Bearer ${data.session.access_token}`;
  const phone = getDevAdminPhone();
  return phone && import.meta.env.DEV ? `AdminPhone ${phone}` : null;
}

let refreshPromise: Promise<boolean> | null = null;
export function refreshAdminSession() {
  refreshPromise ??= adminSupabase.auth
    .refreshSession()
    .then(({ data, error }) => Boolean(data.session && !error))
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
