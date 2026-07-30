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
    <section className="auth-page">
      <div className="auth-page-backdrop" />
      <div className="auth-shell">
        <div className="auth-hero">
          <span className="auth-pill">
            <ShieldCheck size={14} />
            Twin SuperAdmin
          </span>
          <h1>Run the entire twin platform from one clean control room.</h1>
          <p>
            Sign in to monitor clients, twins, users, cost, and system telemetry with the same visual style as the
            admin workspace.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <Sparkles size={16} />
              <div>
                <strong>Unified observability</strong>
                <span>Clients, twins, usage, costs, and health signals in one place.</span>
              </div>
            </div>
            <div className="auth-feature-card">
              <ShieldCheck size={16} />
              <div>
                <strong>Admin-ready access</strong>
                <span>Profile controls, quick search, and entity drill-downs built into the shell.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-single-mode">
            <LogIn size={15} />
            Login
          </div>

          <div className="auth-card-copy">
            <h2>Welcome back</h2>
            <p>Enter your admin credentials to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <div className="auth-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {errorMessage ? <div className="auth-feedback auth-feedback-error">{errorMessage}</div> : null}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              <span>{isLoading ? 'Sending OTP...' : 'Send OTP'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
