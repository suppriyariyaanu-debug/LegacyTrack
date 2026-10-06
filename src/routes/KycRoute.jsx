import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useKyc } from '../context/KycContext';

/**
 * Gate for the application itself. A signed-in user who has not completed the
 * (demo) legal heir KYC is sent to /kyc, and returned to the page they asked
 * for once it is done.
 */
export default function KycRoute() {
  const { isVerified } = useKyc();
  const location = useLocation();

  if (!isVerified) {
    return <Navigate to="/kyc" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
