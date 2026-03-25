import './styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import MonthlyReportPage from '../pages/MonthlyReportPage';
import YearlyReportPage from '../pages/YearlyReportPage';
import MemberReportPage from '../pages/MemberReportPage';
import ExportHistoryPage from '../pages/ExportHistoryPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/reports/monthly" replace />}
          />
          <Route path="/reports/monthly" element={<MonthlyReportPage />} />
          <Route path="/reports/yearly" element={<YearlyReportPage />} />
          <Route path="/reports/members" element={<MemberReportPage />} />
          <Route path="/reports/exports" element={<ExportHistoryPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
