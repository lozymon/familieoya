import '../styles.css';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  ThemeProvider,
  useTheme,
  ThemeToggle,
  Button,
  Input,
  Label,
} from '@familieoya/ui';
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
    borderRadius: '8px',
    border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
    backgroundColor: isDark ? '#09090b' : '#fafafa',
    color: isDark ? '#fafafa' : '#18181b',
    padding: '0 12px',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#09090b' : '#e4e4e7',
        padding: '1.5rem',
      }}
    >
      {/* Theme toggle */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#059669',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              width="24"
              height="24"
            >
              <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
              <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                margin: 0,
                color: isDark ? '#fafafa' : '#18181b',
              }}
            >
              Familieøya
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                margin: '2px 0 0',
                color: isDark ? '#a1a1aa' : '#71717a',
              }}
            >
              Family budget, simplified
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: isDark ? '#18181b' : '#ffffff',
            border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.6)'
              : '0 8px 40px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ marginBottom: '1.75rem' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                margin: '0 0 4px',
                color: isDark ? '#fafafa' : '#18181b',
              }}
            >
              Create account
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                margin: 0,
                color: isDark ? '#a1a1aa' : '#71717a',
              }}
            >
              Start managing your family budget today
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                {...register('name')}
              />
              {errors.name && (
                <p style={{ fontSize: '0.75rem', margin: 0, color: '#e11d48' }}>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p style={{ fontSize: '0.75rem', margin: 0, color: '#e11d48' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                {...register('password')}
              />
              {errors.password && (
                <p style={{ fontSize: '0.75rem', margin: 0, color: '#e11d48' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <Label htmlFor="preferredLanguage">Language</Label>
              <select
                id="preferredLanguage"
                style={inputStyle}
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
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: isDark ? 'rgba(225,29,72,0.1)' : '#fff1f2',
                  border: '1px solid rgba(225,29,72,0.3)',
                  color: isDark ? '#fb7185' : '#e11d48',
                }}
              >
                {errors.root.message}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ marginTop: '4px', width: '100%' }}
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p
            style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              margin: '1.5rem 0 0',
              color: isDark ? '#a1a1aa' : '#71717a',
            }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                fontWeight: 600,
                color: '#059669',
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </p>
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
