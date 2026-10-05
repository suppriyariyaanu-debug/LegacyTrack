import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { demoUser } from '../data/mockData';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  const validate = (values) => {
    const next = {};
    if (!values.email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(values.email)) next.email = 'Enter a valid email address.';
    if (!values.password) next.password = 'Enter your password.';
    else if (values.password.length < 6) next.password = 'Password must be at least 6 characters.';
    return next;
  };

  const signIn = async (values) => {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch {
      setErrors({ form: 'We could not sign you in. Please try again.' });
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn({ email, password });
  };

  const handleDemo = () => {
    // Fills the form with the fictional demo user; no real credentials exist.
    const values = { email: demoUser.email, password: 'demo-access' };
    setEmail(values.email);
    setPassword(values.password);
    signIn(values);
  };

  return (
    <div className="login">
      <aside className="login__brand">
        <Logo tone="light" />
        <div className="login__pitch">
          <h1>Simplifying Financial Legacy Management.</h1>
          <p>
            One organised place for a family to record a loved one&rsquo;s bank accounts and
            insurance policies, gather the right documents, and follow every claim through to
            settlement.
          </p>
          <ul className="login__points">
            <li>
              <Icon name="wallet" size={18} />
              <span>A single register of bank and insurance assets</span>
            </li>
            <li>
              <Icon name="file" size={18} />
              <span>A clear checklist of documents each claim needs</span>
            </li>
            <li>
              <Icon name="claims" size={18} />
              <span>Step-by-step claim and settlement tracking</span>
            </li>
          </ul>
        </div>
        <p className="login__footnote">
          Prototype for demonstration. All data shown is fictional.
        </p>
      </aside>

      <main className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <div className="login__mobile-logo">
            <Logo />
          </div>
          <h2>Sign in</h2>
          <p className="login__sub">Access your family&rsquo;s asset and claim workspace.</p>

          {errors.form && (
            <div className="alert alert--error" role="alert">
              <Icon name="alert" size={16} /> {errors.form}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email address</label>
            <div className={`field__control${errors.email ? ' has-error' : ''}`}>
              <Icon name="mail" size={16} />
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            {errors.email && (
              <p className="field__error" id="email-error">
                {errors.email}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className={`field__control${errors.password ? ' has-error' : ''}`}>
              <Icon name="lock" size={16} />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
            </div>
            {errors.password && (
              <p className="field__error" id="password-error">
                {errors.password}
              </p>
            )}
          </div>

          <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="login__divider">
            <span>or</span>
          </div>

          <button
            className="btn btn--secondary btn--block"
            type="button"
            onClick={handleDemo}
            disabled={submitting}
          >
            Continue with demo account
          </button>

          <p className="login__note">
            <Icon name="info" size={14} />
            Demo sign-in: any valid email and a password of 6 or more characters will work.
          </p>
        </form>
      </main>
    </div>
  );
}
