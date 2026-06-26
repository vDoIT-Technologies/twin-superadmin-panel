import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Lock, MailCheck, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

const PENDING_LOGIN_OTP_KEY = 'superadmin_pending_login_otp';
const OTP_LENGTH = 6;
const RESEND_TIMEOUT_SECONDS = 60;

function readPendingLoginOtpChallenge() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_LOGIN_OTP_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    window.sessionStorage.removeItem(PENDING_LOGIN_OTP_KEY);
    return null;
  }
}

export function persistPendingLoginOtpChallenge(challenge) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(PENDING_LOGIN_OTP_KEY, JSON.stringify(challenge));
}

export function clearPendingLoginOtpChallenge() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PENDING_LOGIN_OTP_KEY);
}

export function LoginOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyLoginOtp, resendLoginOtp, isLoading } = useAuth();
  const initialChallenge = useMemo(
    () => location.state?.pendingChallenge ?? readPendingLoginOtpChallenge(),
    [location.state],
  );
  const [pendingChallenge, setPendingChallenge] = useState(initialChallenge);
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState(
    initialChallenge?.message ?? 'Enter the 6-digit code sent to your email to continue.',
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!initialChallenge) {
      navigate('/login', { replace: true });
      return;
    }

    persistPendingLoginOtpChallenge(initialChallenge);
    setPendingChallenge(initialChallenge);
    setInfoMessage(initialChallenge.message ?? 'Enter the 6-digit code sent to your email to continue.');
    setResendCooldown(RESEND_TIMEOUT_SECONDS);
  }, [initialChallenge, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCooldown]);

  const otpDigits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => otp[index] ?? ''),
    [otp],
  );

  const otpDestination = pendingChallenge?.email ?? 'your email';

  const handleOtpChange = (value) => {
    setErrorMessage('');
    setInfoMessage('');
    setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const nextValue = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);

    if (!nextValue) {
      return;
    }

    handleOtpChange(nextValue);
    const nextIndex = Math.min(nextValue.length, OTP_LENGTH) - 1;
    inputRefs.current[nextIndex]?.focus();
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, digitIndex) => otp[digitIndex] ?? '');

    nextDigits[index] = digit;
    handleOtpChange(nextDigits.join(''));

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const nextDigits = Array.from({ length: OTP_LENGTH }, (_, digitIndex) => otp[digitIndex] ?? '');

      if (nextDigits[index]) {
        nextDigits[index] = '';
        handleOtpChange(nextDigits.join(''));
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = '';
        handleOtpChange(nextDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!pendingChallenge || otp.length !== OTP_LENGTH) {
      return;
    }

    try {
      await verifyLoginOtp({
        email: pendingChallenge.email,
        otp,
        challengeId: pendingChallenge.challengeId,
        verificationToken: pendingChallenge.verificationToken,
      });
      clearPendingLoginOtpChallenge();
      navigate(pendingChallenge.nextPath ?? '/', { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingChallenge || resendCooldown > 0) {
      return;
    }

    setErrorMessage('');

    try {
      const challenge = await resendLoginOtp({
        email: pendingChallenge.email,
        challengeId: pendingChallenge.challengeId,
        verificationToken: pendingChallenge.verificationToken,
      });

      const nextChallenge = {
        ...pendingChallenge,
        ...challenge,
      };

      setPendingChallenge(nextChallenge);
      persistPendingLoginOtpChallenge(nextChallenge);
      setResendCooldown(RESEND_TIMEOUT_SECONDS);
      setInfoMessage(challenge.message ?? 'A fresh verification code has been sent to your email.');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleBackToLogin = () => {
    clearPendingLoginOtpChallenge();
    navigate('/login', {
      replace: true,
      state: {
        from: pendingChallenge?.nextPath ?? '/',
        authError: errorMessage || undefined,
      },
    });
  };

  return (
    <section className="auth-page">
      <div className="auth-page-backdrop" />
      <div className="auth-shell">
        <div className="auth-hero">
          <span className="auth-pill">
            <ShieldCheck size={14} />
            Twin SuperAdmin
          </span>
          <h1>Verify your identity before entering the control room.</h1>
          <p>
            We sent a one-time code to your email so we can finish sign-in securely without exposing the admin
            workspace.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <MailCheck size={16} />
              <div>
                <strong>Email verification</strong>
                <span>Use the latest 6-digit code from your inbox to complete this login attempt.</span>
              </div>
            </div>
            <div className="auth-feature-card">
              <Sparkles size={16} />
              <div>
                <strong>Protected admin access</strong>
                <span>OTP verification adds a second checkpoint before sensitive client and platform actions.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-card auth-card-otp">
          <div className="auth-otp-header">
            <h2>Verify Your Identity</h2>
            <p>Enter the 6-digit code sent to {otpDestination}.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Verification code</span>
            </label>

            <div className="auth-otp-slots">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  className={`auth-otp-slot ${digit ? 'filled' : ''} ${index === otp.length && otp.length < OTP_LENGTH ? 'active' : ''}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleOtpDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>

            {infoMessage ? <div className="auth-feedback auth-feedback-success">{infoMessage}</div> : null}
            {errorMessage ? <div className="auth-feedback auth-feedback-error">{errorMessage}</div> : null}

            <div className="auth-otp-meta">
              {resendCooldown > 0 ? (
                <span>Resend code in {resendCooldown}s</span>
              ) : (
                <button type="button" className="auth-resend-link" onClick={handleResendOtp} disabled={isLoading}>
                  <RotateCcw size={14} />
                  Resend Code
                </button>
              )}
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading || otp.length !== OTP_LENGTH}>
              <span>{isLoading ? 'Verifying OTP...' : 'Verify OTP'}</span>
              <Lock size={16} />
            </button>
          </form>

          <div className="auth-otp-footer">
            <button type="button" className="auth-back-link" onClick={handleBackToLogin} disabled={isLoading}>
              <ArrowLeft size={14} />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
