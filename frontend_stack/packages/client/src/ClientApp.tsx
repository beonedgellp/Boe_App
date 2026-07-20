import { Routes, Route, Navigate } from 'react-router-dom';
import ClientLayout from './layout/ClientLayout.tsx';

import Splash from './pages/Splash.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Explore from './pages/Explore.tsx';
import FundDetail from './pages/FundDetail.tsx';
import StartSipSheet from './pages/StartSipSheet.tsx';
import LumpsumSheet from './pages/LumpsumSheet.tsx';
import PaymentStatus from './pages/PaymentStatus.tsx';
import MandateAuth from './pages/MandateAuth.tsx';
import MandateDetail from './pages/MandateDetail.tsx';
import Portfolio from './pages/Portfolio.tsx';
import WithdrawalRequests from './pages/WithdrawalRequests.tsx';
import Transactions from './pages/Transactions.tsx';
import Statements from './pages/Statements.tsx';
import Notifications from './pages/Notifications.tsx';
import Profile from './pages/Profile.tsx';
import KycDetail from './pages/KycDetail.tsx';
import Security from './pages/Security.tsx';
import Support from './pages/Support.tsx';
import Legal from './pages/Legal.tsx';
import InvestorCharter from './pages/InvestorCharter.tsx';
import GrievanceRedressal from './pages/GrievanceRedressal.tsx';
import ApprovalRequired from './pages/ApprovalRequired.tsx';
import { useSession } from './store/SessionContext.tsx';
import { isApprovedUser } from './utils/approval.ts';
import { RouteErrorBoundary } from '@beonedge/shared/components/RouteErrorBoundary.tsx';
import './styles/mobile/index.css';

function RequireApproved({ children }) {
  const { user, isLoading } = useSession();
  if (isLoading) return null;
  return isApprovedUser(user) ? children : <ApprovalRequired />;
}

export default function ClientApp() {
  return (
    <Routes>
      <Route index element={<Navigate to="splash" replace />} />
      <Route element={<ClientLayout />}>
        <Route path="splash" element={<RouteErrorBoundary><Splash /></RouteErrorBoundary>} />
        <Route path="login" element={<RouteErrorBoundary><Login /></RouteErrorBoundary>} />
        <Route path="start" element={<Navigate to="dashboard" replace />} />
        <Route path="approval-required" element={<RouteErrorBoundary><ApprovalRequired /></RouteErrorBoundary>} />
        <Route path="dashboard" element={<RouteErrorBoundary><Dashboard /></RouteErrorBoundary>} />
        <Route path="explore" element={<RouteErrorBoundary><Explore /></RouteErrorBoundary>} />
        <Route path="funds/:fundId" element={<RouteErrorBoundary><FundDetail /></RouteErrorBoundary>} />
        <Route path="invest/sip/:fundId" element={<RequireApproved><RouteErrorBoundary><StartSipSheet /></RouteErrorBoundary></RequireApproved>} />
        <Route path="invest/lumpsum/:fundId" element={<RequireApproved><RouteErrorBoundary><LumpsumSheet /></RouteErrorBoundary></RequireApproved>} />
        <Route path="payment/:paymentId" element={<RequireApproved><RouteErrorBoundary><PaymentStatus /></RouteErrorBoundary></RequireApproved>} />
        <Route path="mandates/:mandateId/authorize" element={<RequireApproved><RouteErrorBoundary><MandateAuth /></RouteErrorBoundary></RequireApproved>} />
        <Route path="mandates/:mandateId" element={<RouteErrorBoundary><MandateDetail /></RouteErrorBoundary>} />
        <Route path="portfolio" element={<RouteErrorBoundary><Portfolio /></RouteErrorBoundary>} />
        <Route path="withdrawals" element={<RouteErrorBoundary><WithdrawalRequests /></RouteErrorBoundary>} />
        <Route path="transactions" element={<RouteErrorBoundary><Transactions /></RouteErrorBoundary>} />
        <Route path="statements" element={<RouteErrorBoundary><Statements /></RouteErrorBoundary>} />
        <Route path="notifications" element={<RouteErrorBoundary><Notifications /></RouteErrorBoundary>} />
        <Route path="profile" element={<RouteErrorBoundary><Profile /></RouteErrorBoundary>} />
        <Route path="profile/kyc" element={<RouteErrorBoundary><KycDetail /></RouteErrorBoundary>} />
        <Route path="profile/security" element={<RouteErrorBoundary><Security /></RouteErrorBoundary>} />
        <Route path="profile/support" element={<RouteErrorBoundary><Support /></RouteErrorBoundary>} />
        <Route path="profile/legal" element={<RouteErrorBoundary><Legal /></RouteErrorBoundary>} />
        <Route path="investor-charter" element={<RouteErrorBoundary><InvestorCharter /></RouteErrorBoundary>} />
        <Route path="grievance" element={<RouteErrorBoundary><GrievanceRedressal /></RouteErrorBoundary>} />
      </Route>
      <Route path="*" element={<Navigate to="splash" replace />} />
    </Routes>
  );
}
