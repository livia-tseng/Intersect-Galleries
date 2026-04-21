import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setSubmitting(false);

    if (signError) {
      setError(signError.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : signError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setError('Could not load your account. Try again.');
      return;
    }

    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .select('username, onboarding_complete')
      .eq('id', user.id)
      .maybeSingle();

    if (profError || !prof) {
      setError('Your profile could not be loaded. If this is a new project, apply the database migration in Supabase.');
      return;
    }

    if (!prof.onboarding_complete) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate(`/profile/${prof.username}`, { replace: true });
    }
  };

  return (
    <div className="auth-page auth-page-all">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">✦</span>
          <span>Intersect</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Log in with the email you used to sign up</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/signup">Create one free</Link>
        </p>
      </div>
    </div>
  );
}
