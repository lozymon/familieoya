import '../styles.css';
import { useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@familieoya/ui';
import {
  getInvitation,
  acceptInvitation,
  AuthContext,
} from '@familieoya/api-client';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  // If user is not logged in, store token and redirect to login
  if (!auth?.accessToken) {
    sessionStorage.setItem('pendingInvitationToken', token ?? '');
    navigate(`/login?next=/invitations/${token ?? ''}`);
    return null;
  }

  return <InvitationAcceptView token={token!} />;
}

function InvitationAcceptView({ token }: { token: string }) {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getInvitation(token),
    retry: false,
  });

  const {
    mutate: accept,
    isPending,
    error: acceptError,
  } = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: ({ householdId }) => {
      auth?.setActiveHouseholdId(householdId);
      navigate('/dashboard');
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Validating invitation…</p>
      </div>
    );
  }

  const axiosError = error as {
    response?: { status: number };
  } | null;

  if (axiosError?.response?.status === 410) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Invitation expired or already used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              This invitation has expired or has already been accepted. Ask a
              household admin to send a new invitation.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (axiosError?.response?.status === 403) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Wrong account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              This invitation was sent to a different email address. Log out and
              sign in with the invited email, or ask the admin to re-invite your
              current account.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/dashboard">Cancel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              This invitation link is not valid.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle>You&apos;re invited!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            You&apos;ve been invited to join{' '}
            <span className="font-semibold">{invitation.householdName}</span>.
          </p>
          <p className="text-xs text-slate-500">
            Invitation for: {invitation.email}
          </p>

          {acceptError && (
            <p className="text-sm text-red-500">
              Failed to accept invitation. Please try again.
            </p>
          )}

          <div className="flex gap-3">
            <Button onClick={() => accept()} disabled={isPending}>
              {isPending ? 'Joining…' : 'Accept invitation'}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Decline</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
