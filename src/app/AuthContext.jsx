import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AUTH_SESSION_CHANGED_EVENT,
  authService,
  clearAuthToken,
  persistStoredSession,
  readStoredSession,
  setAuthToken,
} from '../services';

const AuthContext = createContext(null);

function defaultProfileFromSession(session) {
  const email = session?.user?.email ?? session?.email ?? '';
  return {
    name: session?.user?.name ?? session?.user?.fullName ?? 'Super Admin',
    email,
    phone: session?.user?.phone ?? '',
    role: session?.user?.role ?? 'Platform SuperAdmin',
    company: session?.user?.company ?? session?.user?.organization ?? 'Twin Protocol',
    bio:
      session?.user?.bio ??
      'Managing client operations, observability, billing oversight, and platform administration.',
  };
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const storedSession = readStoredSession();

    if (storedSession?.token) {
      setAuthToken(storedSession.token);
    }

    return {
      isLoading: false,
      session: storedSession,
      profile: defaultProfileFromSession(storedSession),
    };
  });

  useEffect(() => {
    persistStoredSession(authState.session);
  }, [authState.session]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncSession = (event) => {
      const nextSession = event?.detail?.session ?? readStoredSession();

      if (nextSession?.token) {
        setAuthToken(nextSession.token);
      } else {
        clearAuthToken();
      }

      setAuthState((prev) => ({
        ...prev,
        session: nextSession,
        profile: defaultProfileFromSession(nextSession),
      }));
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(authState.session?.token),
      isLoading: authState.isLoading,
      session: authState.session,
      token: authState.session?.token ?? null,
      user: authState.session?.user ?? null,
      profile: authState.profile,
      async login(credentials) {
        setAuthState((prev) => ({ ...prev, isLoading: true }));

        try {
          const result = await authService.login(credentials);

          if (result.type !== 'authenticated' || !result.token) {
            clearAuthToken();
            setAuthState((prev) => ({
              ...prev,
              isLoading: false,
              session: null,
            }));
            return result;
          }

          setAuthToken(result.token);

          setAuthState({
            isLoading: false,
            session: result,
            profile: defaultProfileFromSession(result),
          });

          return result;
        } catch (error) {
          clearAuthToken();
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            session: null,
          }));
          throw error;
        }
      },
      async verifyLoginOtp(payload) {
        setAuthState((prev) => ({ ...prev, isLoading: true }));

        try {
          const session = await authService.verifyLoginOtp(payload);
          setAuthToken(session.token);
          setAuthState({
            isLoading: false,
            session,
            profile: defaultProfileFromSession(session),
          });
          return session;
        } catch (error) {
          clearAuthToken();
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            session: null,
          }));
          throw error;
        }
      },
      async resendLoginOtp(payload) {
        setAuthState((prev) => ({ ...prev, isLoading: true }));

        try {
          return await authService.resendLoginOtp(payload);
        } finally {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
      },
      async logout() {
        setAuthState((prev) => ({ ...prev, isLoading: true }));
        const refreshToken = readStoredSession()?.refreshToken ?? authState.session?.refreshToken ?? null;

        try {
          await authService.logout(refreshToken);
        } finally {
          clearAuthToken();
          setAuthState({
            isLoading: false,
            session: null,
            profile: defaultProfileFromSession(null),
          });
        }
      },
      updateProfile(partialProfile) {
        setAuthState((prev) => ({
          ...prev,
          profile: { ...prev.profile, ...partialProfile },
        }));
      },
    }),
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
