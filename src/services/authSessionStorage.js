export const AUTH_STORAGE_KEY = 'superadmin_auth_session';
export const AUTH_SESSION_CHANGED_EVENT = 'superadmin-auth-session-changed';

function notifySessionChanged(session) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_CHANGED_EVENT, {
      detail: { session },
    }),
  );
}

export function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession);
    return session && typeof session === 'object' ? session : null;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function persistStoredSession(session, { notify = false } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  if (notify) {
    notifySessionChanged(session ?? null);
  }
}

export function updateStoredSessionTokens(tokens, { notify = false } = {}) {
  const currentSession = readStoredSession();

  if (!currentSession) {
    return null;
  }

  const nextSession = {
    ...currentSession,
    token: tokens.token,
    refreshToken: tokens.refreshToken ?? currentSession.refreshToken ?? null,
    expiresAt: tokens.expiresAt ?? currentSession.expiresAt ?? null,
    expiresIn: tokens.expiresIn ?? currentSession.expiresIn ?? null,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt ?? currentSession.refreshTokenExpiresAt ?? null,
  };

  persistStoredSession(nextSession, { notify });
  return nextSession;
}

export function clearStoredSession(options) {
  persistStoredSession(null, options);
}
