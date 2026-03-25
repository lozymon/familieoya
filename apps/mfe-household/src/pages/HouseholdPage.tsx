import '../styles.css';
import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Crown, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
  Separator,
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

function CreateHouseholdForm({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { currency: 'NOK' },
  });

  const { mutate } = useMutation({
    mutationFn: (values: CreateFormValues) =>
      createHousehold({ name: values.name, currency: values.currency }),
    onSuccess: (household) => onCreated(household.id),
    onError: () => setError('root', { message: 'Failed to create household.' }),
  });

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Create your household</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => mutate(v))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="name">Household name</Label>
            <Input
              id="name"
              placeholder="e.g. The Smiths"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              placeholder="NOK"
              maxLength={3}
              className="uppercase"
              {...register('currency')}
            />
            {errors.currency && (
              <p className="text-sm text-red-500">{errors.currency.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create household'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

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
    register: registerInvite,
    handleSubmit: handleInvite,
    reset: resetInvite,
    formState: { errors: inviteErrors, isSubmitting: isInviting },
    setError: setInviteError,
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema) });

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
      queryClient.invalidateQueries({ queryKey: ['household', householdId] }),
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
      queryClient.invalidateQueries({ queryKey: ['household', householdId] }),
  });

  const currentMember = household?.members.find(
    (m) => m.userId === currentUserId,
  );
  const isAdmin = currentMember?.role === 'admin';

  // No household — offer to create one
  if (!householdId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Household</h1>
        <p className="text-slate-500">
          You don&apos;t have a household yet. Create one below, or accept an
          invitation link from a household admin.
        </p>
        <CreateHouseholdForm
          onCreated={(id) => auth?.setActiveHouseholdId(id)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Household</h1>
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!household) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{household.name}</h1>
        <p className="text-sm text-slate-500">
          Currency: {household.currency} · {household.members.length}{' '}
          {household.members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-slate-100">
            {household.members.map((m: HouseholdMember) => (
              <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-slate-500">{m.email}</p>
                </div>

                <Badge
                  className={
                    m.role === 'admin'
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                  }
                >
                  {m.role === 'admin' && (
                    <Crown className="mr-1 h-3 w-3 inline" />
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
                      className="h-7 w-7 text-red-500 hover:text-red-600"
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

      {/* Invite form (admins only) */}
      {isAdmin && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Invite member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleInvite((v) => sendInvite(v))}
              className="space-y-3"
              noValidate
            >
              <div className="space-y-1">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  {...registerInvite('email')}
                />
                {inviteErrors.email && (
                  <p className="text-sm text-red-500">
                    {inviteErrors.email.message}
                  </p>
                )}
                {inviteErrors.root && (
                  <p className="text-sm text-red-500">
                    {inviteErrors.root.message}
                  </p>
                )}
                {inviteSuccess && (
                  <p className="text-sm text-emerald-600">Invitation sent!</p>
                )}
              </div>
              <Separator />
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Sending…' : 'Send invitation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
