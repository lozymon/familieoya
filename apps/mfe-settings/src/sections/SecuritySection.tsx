import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@familieoya/ui';
import { apiClient } from '@familieoya/api-client';

// ---- Password change ----
const passwordSchema = z.object({
  oldPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
});

type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordChange() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (values: PasswordValues) => {
    setStatus('idle');
    try {
      await apiClient.patch('/auth/me', {
        oldPassword: values.oldPassword,
        password: values.newPassword,
      });
      setStatus('success');
      reset();
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-4 max-w-md"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              {...register('oldPassword')}
              type="password"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {errors.oldPassword && (
              <p className="text-xs text-red-600">
                {errors.oldPassword.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              {...register('newPassword')}
              type="password"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {errors.newPassword && (
              <p className="text-xs text-red-600">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          {status === 'success' && (
            <p className="text-sm text-emerald-600">Password changed.</p>
          )}
          {status === 'error' && (
            <p className="text-sm text-red-600">
              Failed to change password. Check your current password.
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---- 2FA ----
type TwoFaState =
  | { step: 'idle' }
  | { step: 'setup'; qrCode: string; secret: string }
  | { step: 'enabled'; remaining: number; total: number };

function TwoFaSection() {
  const [state, setState] = useState<TwoFaState>({ step: 'idle' });
  const [totpCode, setTotpCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.post<{ qrCode: string; secret: string }>(
        '/auth/2fa/enable',
      );
      setState({ step: 'setup', qrCode: data.qrCode, secret: data.secret });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifyError('');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/2fa/verify', { code: totpCode });
      const { data } = await apiClient.get<{
        remaining: number;
        total: number;
      }>('/auth/2fa/recovery-status');
      setState({
        step: 'enabled',
        remaining: data.remaining,
        total: data.total,
      });
    } catch {
      setVerifyError('Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/2fa/recovery-codes/regenerate');
      const { data } = await apiClient.get<{
        remaining: number;
        total: number;
      }>('/auth/2fa/recovery-status');
      if (state.step === 'enabled') {
        setState({ ...state, remaining: data.remaining, total: data.total });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.step === 'idle' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              2FA is not enabled. Add an extra layer of security to your
              account.
            </p>
            <Button
              onClick={() => void handleEnable()}
              disabled={isLoading}
              className="self-start"
            >
              Enable 2FA
            </Button>
          </div>
        )}

        {state.step === 'setup' && (
          <div className="flex flex-col gap-4 max-w-sm">
            <p className="text-sm text-slate-600">
              Scan the QR code with your authenticator app, then enter the code
              below to verify.
            </p>
            {state.qrCode && (
              <img src={state.qrCode} alt="QR code" className="w-48 h-48" />
            )}
            <p className="text-xs text-slate-500 font-mono break-all">
              Manual key: {state.secret}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-32 rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <Button
                onClick={() => void handleVerify()}
                disabled={isLoading || totpCode.length !== 6}
              >
                {isLoading ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
            {verifyError && (
              <p className="text-xs text-red-600">{verifyError}</p>
            )}
          </div>
        )}

        {state.step === 'enabled' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-emerald-600 font-medium">
              2FA is enabled.
            </p>
            <p className="text-sm text-slate-600">
              Recovery codes: {state.remaining} of {state.total} remaining.
            </p>
            <Button
              variant="outline"
              onClick={() => void handleRegenerate()}
              disabled={isLoading}
              className="self-start"
            >
              {isLoading ? 'Regenerating…' : 'Regenerate codes'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Main section ----
export default function SecuritySection() {
  return (
    <div className="flex flex-col gap-6">
      <PasswordChange />
      <TwoFaSection />
    </div>
  );
}
