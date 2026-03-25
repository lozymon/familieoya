import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './layout/AppLayout';
import { NotificationsPage } from './pages/NotificationsPage';

const LoginPage = lazy(() => import('mfe-auth/LoginPage'));
const RegisterPage = lazy(() => import('mfe-auth/RegisterPage'));
const ProfilePage = lazy(() => import('mfe-auth/ProfilePage'));
const DashboardPage = lazy(() => import('mfe-transaction/DashboardPage'));
const TransactionListPage = lazy(
  () => import('mfe-transaction/TransactionListPage'),
);
const TransactionFormPage = lazy(
  () => import('mfe-transaction/TransactionFormPage'),
);
const CategoriesPage = lazy(() => import('mfe-transaction/CategoriesPage'));
const BudgetPage = lazy(() => import('mfe-budget/BudgetPage'));
const HouseholdPage = lazy(() => import('mfe-household/HouseholdPage'));
const InvitationPage = lazy(() => import('mfe-household/InvitationPage'));

function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Invitation deep link — auth check handled inside InvitationPage */}
        <Route path="/invitations/:token" element={<InvitationPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionListPage />} />
          <Route path="/transactions/new" element={<TransactionFormPage />} />
          <Route
            path="/transactions/:id/edit"
            element={<TransactionFormPage />}
          />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/budgets" element={<BudgetPage />} />
          <Route path="/households" element={<HouseholdPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
