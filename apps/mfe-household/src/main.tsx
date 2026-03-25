import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import HouseholdPage from './pages/HouseholdPage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <StrictMode>
    <HouseholdPage />
  </StrictMode>,
);
