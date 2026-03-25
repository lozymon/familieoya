import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import SettingsPage from './pages/SettingsPage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <StrictMode>
    <SettingsPage />
  </StrictMode>,
);
