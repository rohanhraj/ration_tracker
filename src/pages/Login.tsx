import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Store } from 'lucide-react';
import { useData } from '../store/DataContext';

const Login = () => {
  const { login, user, authLoading } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && user) {
    return <Navigate to={user.role === 'owner' ? '/inventory' : '/distribution'} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand">
          <div className="brand-icon large">
            <Store size={28} />
          </div>
          <div>
            <h1>Ration Manager</h1>
            <p>Owner and worker access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <div>
            <label>User ID</label>
            <input
              type="text"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label>Password</label>
            <div className="input-with-icon password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <div className="alert danger">{error}</div>}
          <button className="btn-primary full-width" type="submit" disabled={submitting}>
            <LockKeyhole size={18} />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
