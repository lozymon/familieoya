import { apiClient } from './client';

export interface Household {
  id: string;
  name: string;
  currency: string; // ISO 4217 (NOK, BRL, USD, …)
  createdAt: string;
}

export interface HouseholdMember {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface HouseholdDetail extends Household {
  members: HouseholdMember[];
}

export interface InvitationDetails {
  email: string;
  householdName: string;
  expiresAt: string;
}

export interface CreateHouseholdDto {
  name: string;
  currency: string;
}

export interface UpdateHouseholdDto {
  name: string;
}

export async function createHousehold(
  dto: CreateHouseholdDto,
): Promise<Household> {
  const { data } = await apiClient.post<Household>('/households', dto);
  return data;
}

export async function getHousehold(id: string): Promise<HouseholdDetail> {
  const { data } = await apiClient.get<HouseholdDetail>(`/households/${id}`);
  return data;
}

export async function updateHousehold(
  id: string,
  dto: UpdateHouseholdDto,
): Promise<Household> {
  const { data } = await apiClient.patch<Household>(`/households/${id}`, dto);
  return data;
}

export async function inviteMember(
  householdId: string,
  email: string,
): Promise<void> {
  await apiClient.post(`/households/${householdId}/invitations`, { email });
}

export async function removeMember(
  householdId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/households/${householdId}/members/${userId}`);
}

export async function updateMemberRole(
  householdId: string,
  userId: string,
  role: 'admin' | 'member',
): Promise<void> {
  await apiClient.patch(`/households/${householdId}/members/${userId}/role`, {
    role,
  });
}

export async function getInvitation(token: string): Promise<InvitationDetails> {
  const { data } = await apiClient.get<InvitationDetails>(
    `/invitations/${token}`,
  );
  return data;
}

export async function acceptInvitation(
  token: string,
): Promise<{ householdId: string; householdName: string }> {
  const { data } = await apiClient.post<{
    householdId: string;
    householdName: string;
  }>(`/invitations/${token}/accept`);
  return data;
}
