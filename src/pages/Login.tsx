import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { LockKeyhole, Store } from 'lucide-react';
import { useData } from '../store/DataContext';

const Login = () => {
  const { login, user, authLoading } = useData();
  const [username, setUsername] = useState('123456');
  const [password, setPassword] = useState('Mahesh@123');
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
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="alert danger">{error}</div>}
          <button className="btn-primary full-width" type="submit" disabled={submitting}>
            <LockKeyhole size={18} />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-help">
          <span>Owner: 123456 / Mahesh@123</span>
          <span>Worker: 123456 / 123456</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
