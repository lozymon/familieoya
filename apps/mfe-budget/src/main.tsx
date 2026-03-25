import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import BudgetPage from './pages/BudgetPage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <StrictMode>
    <BudgetPage />
  </StrictMode>,
);
