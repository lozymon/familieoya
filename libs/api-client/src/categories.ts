import { apiClient } from './client';

export interface Category {
  id: string;
  householdId: string;
  name: string;
  key: string | null; // null for user-created categories
  createdAt: string;
}

export interface CreateCategoryDto {
  name: string;
}

export interface UpdateCategoryDto {
  name: string;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>('/categories');
  return data;
}

export async function createCategory(
  dto: CreateCategoryDto,
): Promise<Category> {
  const { data } = await apiClient.post<Category>('/categories', dto);
  return data;
}

export async function updateCategory(
  id: string,
  dto: UpdateCategoryDto,
): Promise<Category> {
  const { data } = await apiClient.patch<Category>(`/categories/${id}`, dto);
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
