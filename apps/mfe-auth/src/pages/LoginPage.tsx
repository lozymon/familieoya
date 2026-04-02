import '../styles.css';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@familieoya/ui';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

const dark = {
  page: { background: '#0f172a' },
  brand: { color: '#f8fafc' },
  tagline: { color: '#64748b' },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  heading: { color: '#f1f5f9' },
  subheading: { color: '#64748b' },
  label: { color: '#cbd5e1' },
  input: { background: '#0f172a', borderColor: '#334155', color: '#f1f5f9' },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
  },
  errorText: { color: '#f87171' },
  footer: { color: '#64748b' },
  link: { color: '#818cf8' },
  toggle: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
  },
} as const;

const light = {
  page: { background: '#f1f5f9' },
  brand: { color: '#0f172a' },
  tagline: { color: '#64748b' },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 40px -8px rgba(0,0,0,0.12)',
  },
  heading: { color: '#0f172a' },
  subheading: { color: '#64748b' },
  label: { color: '#374151' },
  input: { background: '#f8fafc', borderColor: '#d1d5db', color: '#111827' },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
  },
  errorText: { color: '#dc2626' },
  footer: { color: '#6b7280' },
  link: { color: '#6366f1' },
  toggle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#64748b',
  },
} as const;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  const t = isDark ? dark : light;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values);
      navigate('/dashboard');
    } catch {
      setError('root', { message: 'Invalid email or password' });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        transition: 'background 0.2s',
        ...t.page,
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={() => setIsDark((d) => !d)}
        aria-label="Toggle theme"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          ...t.toggle,
        }}
      >
        {isDark ? (
          /* Sun */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          /* Moon */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: '#6366f1',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              width="22"
              height="22"
            >
              <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
              <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              margin: 0,
              transition: 'color 0.2s',
              ...t.brand,
            }}
          >
            Familieoya
          </h1>
          <p
            style={{
              fontSize: '0.8125rem',
              marginTop: '4px',
              transition: 'color 0.2s',
              ...t.tagline,
            }}
          >
            Family budget, simplified
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            borderRadius: '12px',
            padding: '2rem',
            transition: 'all 0.2s',
            ...t.card,
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                margin: '0 0 4px',
                transition: 'color 0.2s',
                ...t.heading,
              }}
            >
              Welcome back
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                margin: 0,
                transition: 'color 0.2s',
                ...t.subheading,
              }}
            >
              Sign in to your account to continue
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <label
                htmlFor="email"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  ...t.label,
                }}
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                style={{ transition: 'all 0.2s', ...t.input }}
                {...register('email')}
              />
              {errors.email && (
                <p style={{ fontSize: '0.8125rem', margin: 0, ...t.errorText }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <label
                  htmlFor="password"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'color 0.2s',
                    ...t.label,
                  }}
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    color: '#6366f1',
                    fontSize: '0.8125rem',
                    textDecoration: 'none',
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                style={{ transition: 'all 0.2s', ...t.input }}
                {...register('password')}
              />
              {errors.password && (
                <p style={{ fontSize: '0.8125rem', margin: 0, ...t.errorText }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {errors.root && (
              <div
                style={{
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '0.875rem',
                  ...t.errorBox,
                }}
              >
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '4px',
                width: '100%',
                height: '42px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: 500,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = '#4f46e5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#6366f1';
              }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: '0.875rem',
                margin: '4px 0 0',
                transition: 'color 0.2s',
                ...t.footer,
              }}
            >
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                style={{
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                  ...t.link,
                }}
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
