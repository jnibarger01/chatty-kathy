const STORAGE_KEY = "relay.username";

export function readStoredUsername(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function storeUsername(name: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* private mode */
  }
}

export function clearStoredUsername() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || "?";
}

export function toneIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 4;
}
