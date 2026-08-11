const storageKey = "ruvie-admin-phone";

export function getAdminPhone() {
  return sessionStorage.getItem(storageKey);
}

export function setAdminPhone(phone: string) {
  sessionStorage.setItem(storageKey, phone);
}

export function clearAdminPhone() {
  sessionStorage.removeItem(storageKey);
}
