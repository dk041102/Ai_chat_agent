const SESSION_KEY = 'volta_session_id';

export function getStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionId(id: string): void {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredSessionId(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}
