import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { NotificationsProvider } from './context/NotificationsContext';
import './styles/tokens.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/login.css';
import './styles/dashboard.css';
import './styles/forms.css';
import './styles/deceased.css';
import './styles/bank.css';
import './styles/claims.css';
import './styles/documents.css';
import './styles/shell.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CaseProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </CaseProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
