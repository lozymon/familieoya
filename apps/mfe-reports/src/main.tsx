import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import MonthlyReportPage from './pages/MonthlyReportPage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <StrictMode>
    <MonthlyReportPage />
  </StrictMode>,
);
