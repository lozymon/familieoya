import '../styles.css';
import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Crown, Trash2, Home } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
} from '@familieoya/ui';
import {
  getHousehold,
  createHousehold,
  inviteMember,
  removeMember,
  updateMemberRole,
  AuthContext,
  type HouseholdMember,
} from '@familieoya/api-client';

const createSchema = z.object({
  name: z.string().min(1, 'Household name is required'),
  currency: z.string().length(3, 'Enter a 3-letter currency code (e.g. NOK)'),
});

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type InviteFormValues = z.infer<typeof inviteSchema>;

export default function HouseholdPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;
  const currentUserId = auth?.user?.id;
  const queryClient = useQueryClient();
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const { data: household, isLoading } = useQuery({
    queryKey: ['household', householdId],
    queryFn: () => getHousehold(householdId!),
    enabled: !!householdId,
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
    setError: setCreateError,
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { currency: 'NOK' },
  });

  const {
    register: registerInvite,
    handleSubmit: handleInvite,
    reset: resetInvite,
    formState: { errors: inviteErrors, isSubmitting: isInviting },
    setError: setInviteError,
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema) });

  const { mutate: createH } = useMutation({
    mutationFn: (values: CreateFormValues) =>
      createHousehold({ name: values.name, currency: values.currency }),
    onSuccess: (h) => auth?.setActiveHouseholdId(h.id),
    onError: () =>
      setCreateError('root', { message: 'Failed to create household.' }),
  });

  const { mutate: sendInvite } = useMutation({
    mutationFn: (values: InviteFormValues) =>
      inviteMember(householdId!, values.email),
    onSuccess: () => {
      resetInvite();
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    },
    onError: () =>
      setInviteError('root', { message: 'Failed to send invitation.' }),
  });

  const { mutate: removeUser } = useMutation({
    mutationFn: (userId: string) => removeMember(householdId!, userId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['household', householdId],
      }),
  });

  const { mutate: changeRole } = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: 'admin' | 'member';
    }) => updateMemberRole(householdId!, userId, role),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['household', householdId],
      }),
  });

  const currentMember = household?.members.find(
    (m) => m.userId === currentUserId,
  );
  const isAdmin = currentMember?.role === 'admin';

  /* ── No household ─────────────────────────────────────────── */
  if (!householdId) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Household
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create a household or join one via invitation
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-8 py-12">
            {/* Icon + messaging */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Home className="h-7 w-7 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  No household yet
                </p>
                <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  A household groups your family&apos;s budgets, transactions,
                  and members in one place. Create yours below or accept an
                  invitation from an admin.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full max-w-sm border-t border-zinc-100 dark:border-zinc-800" />

            {/* Create form */}
            <form
              onSubmit={handleCreate((v) => createH(v))}
              noValidate
              className="flex w-full max-w-sm flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Household name</Label>
                <Input
                  id="name"
                  placeholder="e.g. The Smiths"
                  {...registerCreate('name')}
                />
                {createErrors.name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {createErrors.name.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  placeholder="NOK"
                  maxLength={3}
                  className="uppercase"
                  {...registerCreate('currency')}
                />
                {createErrors.currency && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {createErrors.currency.message}
                  </p>
                )}
              </div>

              {createErrors.root && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {createErrors.root.message}
                </p>
              )}

              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating ? 'Creating…' : 'Create household'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Loading ──────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Household
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!household) return null;

  /* ── Has household ────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {household.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {household.currency} ·{' '}
            {household.members.length === 1
              ? '1 member'
              : `${household.members.length} members`}
          </p>
        </div>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {household.members.map((m: HouseholdMember) => (
              <li key={m.userId} className="flex items-center gap-3 px-6 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {(m.name ?? m.email ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {m.name ?? m.email}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {m.email}
                  </p>
                </div>
                <Badge variant={m.role === 'admin' ? 'admin' : 'member'}>
                  {m.role === 'admin' && (
                    <Crown className="mr-1 inline h-3 w-3" />
                  )}
                  {m.role}
                </Badge>
                {isAdmin && m.userId !== currentUserId && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        changeRole({
                          userId: m.userId,
                          role: m.role === 'admin' ? 'member' : 'admin',
                        })
                      }
                    >
                      {m.role === 'admin' ? 'Make member' : 'Make admin'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-rose-500 hover:text-rose-600 dark:text-rose-400"
                      onClick={() => removeUser(m.userId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Invite member (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invite member
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleInvite((v) => sendInvite(v))}
              noValidate
              className="flex flex-col gap-4"
            >
              <div className="flex gap-3">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  className="max-w-sm"
                  {...registerInvite('email')}
                />
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? 'Sending…' : 'Send invitation'}
                </Button>
              </div>
              {inviteErrors.email && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {inviteErrors.email.message}
                </p>
              )}
              {inviteErrors.root && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {inviteErrors.root.message}
                </p>
              )}
              {inviteSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Invitation sent!
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
