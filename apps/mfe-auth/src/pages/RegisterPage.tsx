import '../styles.css';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme, ThemeToggle } from '@familieoya/ui';
import { register as apiRegister } from '@familieoya/api-client';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  preferredLanguage: z.enum(['en', 'no', 'pt']).default('en'),
});

type FormValues = z.infer<typeof schema>;

function RegisterForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { preferredLanguage: 'en' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await apiRegister(values);
      await login({ email: values.email, password: values.password });
      navigate('/dashboard');
    } catch {
      setError('root', {
        message: 'Registration failed. Email may already be in use.',
      });
    }
  };

  const inputStyle = {
    height: '40px',
    width: '100%',
    borderRadius: '6px',
    border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
    background: isDark ? '#0f172a' : '#f8fafc',
    color: isDark ? '#f1f5f9' : '#111827',
    padding: '0 12px',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: 500 as const,
    color: isDark ? '#cbd5e1' : '#374151',
  };

  const errorStyle = {
    color: isDark ? '#f87171' : '#dc2626',
    fontSize: '0.8125rem',
    margin: 0,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: isDark ? '#0f172a' : '#f1f5f9',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ position: 'fixed', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>

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
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
            Familieoya
          </h1>
          <p
            style={{
              fontSize: '0.8125rem',
              marginTop: '4px',
              color: '#64748b',
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
            background: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0,0,0,0.5)'
              : '0 10px 40px -8px rgba(0,0,0,0.12)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                margin: '0 0 4px',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
            >
              Create account
            </h2>
            <p style={{ fontSize: '0.875rem', margin: 0, color: '#64748b' }}>
              Start managing your family budget today
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
              <label htmlFor="name" style={labelStyle}>
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                style={inputStyle}
                {...register('name')}
              />
              {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <label htmlFor="email" style={labelStyle}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                style={inputStyle}
                {...register('email')}
              />
              {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                style={inputStyle}
                {...register('password')}
              />
              {errors.password && (
                <p style={errorStyle}>{errors.password.message}</p>
              )}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <label htmlFor="preferredLanguage" style={labelStyle}>
                Language
              </label>
              <select
                id="preferredLanguage"
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                }}
                {...register('preferredLanguage')}
              >
                <option value="en">English</option>
                <option value="no">Norsk</option>
                <option value="pt">Português</option>
              </select>
            </div>

            {errors.root && (
              <div
                style={{
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '0.875rem',
                  background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
                  border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`,
                  color: isDark ? '#fca5a5' : '#dc2626',
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
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: '0.875rem',
                margin: '4px 0 0',
                color: '#64748b',
              }}
            >
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isDark ? '#818cf8' : '#6366f1',
                }}
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <ThemeProvider>
      <RegisterForm />
    </ThemeProvider>
  );
}
