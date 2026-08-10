import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, LogIn, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { persistPendingLoginOtpChallenge } from './LoginOtpPage';

export function HomeAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (location.state?.authError) {
      setErrorMessage(location.state.authError);
    }
  }, [location.state]);

  const handleChange = (key, value) => {
    setErrorMessage('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const result = await login(form);

      if (result?.type !== 'otp_required' || !result?.email) {
        setErrorMessage('Login could not start OTP verification. Please try again.');
        return;
      }

      const nextPath = location.state?.from ?? '/';
      const pendingChallenge = {
        ...result,
        type: 'otp_required',
        email: result?.email || form.email,
        nextPath,
      };

      persistPendingLoginOtpChallenge(pendingChallenge);
      navigate('/login/verify-otp', {
        replace: true,
        state: {
          pendingChallenge,
        },
      });
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to login. Please try again.');
    }
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
          <h1 className="mt-4 max-w-[11ch] text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[0.95]">Run the entire twin platform from one clean control room.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Sign in to monitor clients, twins, users, cost, and system telemetry with the same visual style as the
            admin workspace.
          </p>

          <div className="mt-7 grid max-w-xl gap-3.5">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-indigo-600 shadow-sm">
              <Sparkles size={16} />
              <div>
                <strong className="block text-sm font-semibold text-slate-900">Unified observability</strong>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">Clients, twins, usage, costs, and health signals in one place.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-indigo-600 shadow-sm">
              <ShieldCheck size={16} />
              <div>
                <strong className="block text-sm font-semibold text-slate-900">Admin-ready access</strong>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">Profile controls, quick search, and entity drill-downs built into the shell.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-floating backdrop-blur-md">
          <div className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-slate-50 px-3.5 text-xs font-bold text-slate-800">
            <LogIn size={15} />
            Login
          </div>

          <div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Enter your admin credentials to continue.</p>
          </div>

          <form className="mt-5 grid gap-3.5" onSubmit={handleSubmit}>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-600">Email</span>
              <input
                type="email"
                name="email"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                autoComplete="username"
                required
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-600">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                  autoComplete="current-password"
                  required
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {errorMessage ? <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">{errorMessage}</div> : null}

            <button type="submit" className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-blue-600 px-4.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-75" disabled={isLoading}>
              <span>{isLoading ? 'Sending OTP...' : 'Send OTP'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
