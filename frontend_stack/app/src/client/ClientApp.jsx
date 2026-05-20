import { Routes, Route, Navigate } from 'react-router-dom';
import ClientLayout from './layout/ClientLayout.jsx';

import Splash from './pages/Splash.jsx';
import Login from './pages/Login.jsx';
import AppStart from './pages/AppStart.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Explore from './pages/Explore.jsx';
import FundDetail from './pages/FundDetail.jsx';
import StartSipSheet from './pages/StartSipSheet.jsx';
import LumpsumSheet from './pages/LumpsumSheet.jsx';
import PaymentStatus from './pages/PaymentStatus.jsx';
import MandateAuth from './pages/MandateAuth.jsx';
import MandateDetail from './pages/MandateDetail.jsx';
import Portfolio from './pages/Portfolio.jsx';
import WithdrawalRequests from './pages/WithdrawalRequests.jsx';
import Transactions from './pages/Transactions.jsx';
import Statements from './pages/Statements.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import KycDetail from './pages/KycDetail.jsx';
import Security from './pages/Security.jsx';
import Support from './pages/Support.jsx';
import Legal from './pages/Legal.jsx';
import InvestorCharter from './pages/InvestorCharter.jsx';
import GrievanceRedressal from './pages/GrievanceRedressal.jsx';
import ApprovalRequired from './pages/ApprovalRequired.jsx';
import { useSession } from './store/SessionContext.jsx';
import { isApprovedUser } from './utils/approval.js';
import { RouteErrorBoundary } from '../shared/components/RouteErrorBoundary.jsx';
import './styles/base.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/portfolio.css';
import './styles/explore.css';
import './styles/fund-detail.css';
import './styles/invest.css';
import './styles/transactions.css';
import './styles/profile.css';
import './styles/disclosures.css';
import './styles/components.css';

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
        <Route path="start" element={<RouteErrorBoundary><AppStart /></RouteErrorBoundary>} />
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
