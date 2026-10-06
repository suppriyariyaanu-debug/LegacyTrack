import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import BankAccountDetails from './pages/BankAccountDetails';
import BankAccountForm from './pages/BankAccountForm';
import BankAccounts from './pages/BankAccounts';
import ClaimDetails from './pages/ClaimDetails';
import Claims from './pages/Claims';
import Dashboard from './pages/Dashboard';
import DeceasedDetails from './pages/DeceasedDetails';
import DeceasedList from './pages/DeceasedList';
import DeceasedRegistration from './pages/DeceasedRegistration';
import DocumentDetails from './pages/DocumentDetails';
import Documents from './pages/Documents';
import InsurancePolicies from './pages/InsurancePolicies';
import InsurancePolicyDetails from './pages/InsurancePolicyDetails';
import InsurancePolicyForm from './pages/InsurancePolicyForm';
import KycVerification from './pages/KycVerification';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import KycRoute from './routes/KycRoute';
import ProtectedRoute from './routes/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        {/* Signed in, but the legal heir KYC (demo) comes before the application. */}
        <Route path="/kyc" element={<KycVerification />} />

        <Route element={<KycRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/deceased" element={<DeceasedList />} />
          <Route path="/deceased/new" element={<DeceasedRegistration />} />
          <Route path="/deceased/:id" element={<DeceasedDetails />} />

          <Route path="/bank-accounts" element={<BankAccounts />} />
          <Route path="/bank-accounts/new" element={<BankAccountForm />} />
          <Route path="/bank-accounts/:id" element={<BankAccountDetails />} />

          <Route path="/insurance" element={<InsurancePolicies />} />
          <Route path="/insurance/new" element={<InsurancePolicyForm />} />
          <Route path="/insurance/:id" element={<InsurancePolicyDetails />} />

          <Route path="/claims" element={<Claims />} />
          <Route path="/claims/:id" element={<ClaimDetails />} />

          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<DocumentDetails />} />

          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />

          <Route path="*" element={<NotFound />} />
        </Route>
        </Route>
      </Route>
    </Routes>
  );
}
