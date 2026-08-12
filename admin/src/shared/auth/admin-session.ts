const sessionKey = "ruvie-admin-session";
const devPhoneKey = "ruvie-admin-dev-phone";

type StoredAdminSession = {
  token: string;
  expiresAt: string;
};

export function storeAdminToken(session: StoredAdminSession) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearAdminCredentials() {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(devPhoneKey);
}

export function getAdminToken() {
  const stored = localStorage.getItem(sessionKey);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Partial<StoredAdminSession>;
    if (
      typeof session.token !== "string" ||
      !session.token ||
      typeof session.expiresAt !== "string" ||
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      clearAdminCredentials();
      return null;
    }
    return session.token;
  } catch {
    clearAdminCredentials();
    return null;
  }
}

export function getDevAdminPhone() {
  return import.meta.env.DEV ? sessionStorage.getItem(devPhoneKey) : null;
}

export function setDevAdminPhone(phone: string | null) {
  if (!import.meta.env.DEV) return;
  if (phone) sessionStorage.setItem(devPhoneKey, phone);
  else sessionStorage.removeItem(devPhoneKey);
}

export function getAdminAuthorization() {
  const token = getAdminToken();
  if (token) return `Bearer ${token}`;
  const phone = getDevAdminPhone();
  return phone && import.meta.env.DEV ? `AdminPhone ${phone}` : null;
}

