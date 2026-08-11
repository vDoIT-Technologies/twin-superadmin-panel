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
    <section className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.18),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:38px_38px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.7),transparent_85%)]" />
      <div className="relative z-10 grid min-h-screen grid-cols-1 items-center gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,440px)] lg:px-16">
        <div>
          <span className="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-indigo-600/10 bg-white/80 px-3.5 text-xs font-bold text-indigo-600 shadow-sm">
            <ShieldCheck size={14} />
            Twin SuperAdmin
          </span>
          <h1 className="mt-4 max-w-[11ch] text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[0.95]">Verify your identity before entering the control room.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            We sent a one-time code to your email so we can finish sign-in securely without exposing the admin
            workspace.
          </p>

          <div className="mt-7 grid max-w-xl gap-3.5">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-indigo-600 shadow-sm">
              <MailCheck size={16} />
              <div>
                <strong className="block text-sm font-semibold text-slate-900">Email verification</strong>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">Use the latest 6-digit code from your inbox to complete this login attempt.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-indigo-600 shadow-sm">
              <Sparkles size={16} />
              <div>
                <strong className="block text-sm font-semibold text-slate-900">Protected admin access</strong>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">OTP verification adds a second checkpoint before sensitive client and platform actions.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-floating backdrop-blur-md">
          <div className="-mx-5 -mt-5 mb-5 bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 text-center text-white">
            <h2 className="text-2xl font-bold tracking-tight">Verify Your Identity</h2>
            <p className="mt-2 text-xs text-white/80">Enter the 6-digit code sent to {otpDestination}.</p>
          </div>

          <form className="grid gap-3.5" onSubmit={handleSubmit}>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-600">Verification code</span>
            </label>

            <div className="flex justify-center gap-2 sm:gap-3">
              {otpDigits.map((digit, index) => {
                const isCurrentActive = index === otp.length && otp.length < OTP_LENGTH;
                const isFilled = Boolean(digit);

                return (
                  <input
                    key={index}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    className={`h-14 w-11 rounded-2xl border text-center text-xl font-bold transition-all duration-150 outline-none sm:h-16 sm:w-14 ${
                      isFilled
                        ? 'border-blue-500 bg-white text-blue-700 shadow-sm ring-2 ring-blue-500/10'
                        : isCurrentActive
                        ? 'border-blue-500 bg-white text-slate-900 ring-4 ring-blue-500/20 shadow-md'
                        : 'border-slate-200/90 bg-slate-100/80 text-slate-800 hover:border-slate-300 hover:bg-slate-100'
                    }`}
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
                );
              })}
            </div>

            {infoMessage ? <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-700">{infoMessage}</div> : null}
            {errorMessage ? <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">{errorMessage}</div> : null}

            <div className="mt-1 text-center text-xs text-slate-500">
              {resendCooldown > 0 ? (
                <span>Resend code in {resendCooldown}s</span>
              ) : (
                <button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-60" onClick={handleResendOtp} disabled={isLoading}>
                  <RotateCcw size={14} />
                  Resend Code
                </button>
              )}
            </div>

            <button type="submit" className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-blue-600 px-4.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-75" disabled={isLoading || otp.length !== OTP_LENGTH}>
              <span>{isLoading ? 'Verifying OTP...' : 'Verify OTP'}</span>
              <Lock size={16} />
            </button>
          </form>

          <div className="mt-5 text-center">
            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-60" onClick={handleBackToLogin} disabled={isLoading}>
              <ArrowLeft size={14} />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
