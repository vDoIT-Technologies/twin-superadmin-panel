import api from './httpClient';

const AUTH_REQUEST_TIMEOUT_MS = 60_000;

function getPayload(data) {
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data;
  }

  if (data?.result && typeof data.result === 'object' && !Array.isArray(data.result)) {
    return data.result;
  }

  return data ?? {};
}

function getMessage(source, fallbackMessage) {
  return (
    source?.message ||
    source?.error ||
    source?.data?.message ||
    source?.data?.error ||
    source?.result?.message ||
    source?.result?.error ||
    fallbackMessage
  );
}

function toAuthError(error, fallbackMessage) {
  const status = error?.response?.status;
  const message = getMessage(error?.response?.data, error?.message || fallbackMessage);

  if (error?.code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(message)) {
    return new Error('The authentication server did not respond in time. Confirm the local backend is running on port 8000 and that OTP email delivery is configured.');
  }

  if (status === 404 && /verify-login-otp|resend-login-otp/i.test(message)) {
    return new Error('OTP verification service is unavailable right now. Please make sure the superadmin backend is running with the latest auth routes.');
  }

  if (status === 404 && /route .* not found/i.test(message)) {
    return new Error('Authentication service endpoint was not found. Please verify the backend server and API base URL.');
  }

  return new Error(message || fallbackMessage);
}

function assertSuccessfulResponse(data, fallbackMessage) {
  if (data?.success === false) {
    throw new Error(getMessage(data, fallbackMessage));
  }
}

function toUser(data, email) {
  const payload = getPayload(data);
  const user = payload.user || payload.admin || payload.account;

  if (user && typeof user === 'object') {
    return user;
  }

  return {
    email,
    name: payload.name || payload.fullName || email?.split('@')[0] || 'Super Admin',
  };
}

function toSession(data, email) {
  const payload = getPayload(data);

  return {
    type: 'authenticated',
    token: payload.token || payload.accessToken || payload.access_token || payload.jwt || data?.token || data?.accessToken || data?.access_token || data?.jwt || null,
    refreshToken: payload.refreshToken || payload.refresh_token || data?.refreshToken || data?.refresh_token || null,
    user: toUser(data, email),
    raw: data,
  };
}

function assertCompleteSession(session, fallbackMessage) {
  if (!session.token || !session.refreshToken) {
    throw new Error(fallbackMessage);
  }

  return session;
}

function toLoginChallenge(data, email) {
  return {
    type: 'otp_required',
    email,
    message: (() => {
      const message = getMessage(data, 'A verification code was sent to your email.');
      return /login successful|authenticated|signed in successfully/i.test(message)
        ? 'A verification code was sent to your email.'
        : message;
    })(),
    raw: data,
  };
}

export const authService = {
  async login(credentials) {
    try {
      const response = await api.post('/api/v1/auth/login', {
        email: credentials.email,
        password: credentials.password,
      }, { timeout: AUTH_REQUEST_TIMEOUT_MS });

      assertSuccessfulResponse(response.data, 'Unable to login. Please verify your credentials and try again.');
      return toLoginChallenge(response.data, credentials.email);
    } catch (error) {
      throw toAuthError(error, 'Unable to login. Please verify your credentials and try again.');
    }
  },

  async verifyLoginOtp(payload) {
    try {
      const response = await api.post('/api/v1/auth/verify-login-otp', {
        email: payload.email,
        otp: payload.otp,
      }, { timeout: AUTH_REQUEST_TIMEOUT_MS });

      assertSuccessfulResponse(response.data, 'Unable to verify the login code. Please try again.');
      return assertCompleteSession(
        toSession(response.data, payload.email),
        'OTP verification succeeded but the API did not return the final access and refresh tokens.',
      );
    } catch (error) {
      throw toAuthError(error, 'Unable to verify the login code. Please try again.');
    }
  },

  async resendLoginOtp(payload) {
    try {
      const response = await api.post('/api/v1/auth/resend-login-otp', {
        email: payload.email,
      }, { timeout: AUTH_REQUEST_TIMEOUT_MS });

      assertSuccessfulResponse(response.data, 'Unable to resend the login code right now. Please wait a minute and try again.');
      return {
        ...toLoginChallenge(response.data, payload.email),
        message: getMessage(response.data, 'A fresh verification code has been sent.'),
      };
    } catch (error) {
      throw toAuthError(error, 'Unable to resend the login code right now. Please wait a minute and try again.');
    }
  },

  async logout(refreshToken) {
    try {
      const response = await api.post('/api/v1/auth/logout', {
        refreshToken: refreshToken ?? null,
      });

      assertSuccessfulResponse(response.data, 'Unable to logout cleanly. Your local session was still cleared.');
    } catch (error) {
      throw toAuthError(error, 'Unable to logout cleanly. Your local session was still cleared.');
    }
  },
};
