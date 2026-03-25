import '../styles.css';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="preferredLanguage">Language</Label>
              <select
                id="preferredLanguage"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                {...register('preferredLanguage')}
              >
                <option value="en">English</option>
                <option value="no">Norsk</option>
                <option value="pt">Português</option>
              </select>
            </div>

            {errors.root && (
              <p className="text-sm text-red-500">{errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-slate-900 underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
