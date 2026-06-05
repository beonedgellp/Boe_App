export { default as ClientApp } from './ClientApp.jsx';

export { SessionProvider, useSession } from './store/SessionContext.jsx';
export { AdminSessionProvider, useAdminSession } from './store/AdminSessionContext.jsx';

export {
  apiRequest,
  useHttpApi,
  serviceMode,
} from './services/_util.js';

export {
  login,
  signup,
  logout,
  currentUser,
  listPendingApprovals,
  checkReachability,
  hasRole,
} from './services/authApi.js';

export {
  isApprovedUser,
  isPendingApprovalUser,
  isTerminalAccount,
  isExecutionRoute,
  approvalRef,
} from './utils/approval.js';

export {
  fmtMoney,
  formatMoney,
  fmtNum,
  fmtPct,
  fmtUnits,
  fmtDate,
  relativeDay,
} from './utils/format.js';

export { openRazorpayCheckout } from './utils/razorpay.js';
export { openOnboarding } from './utils/openOnboarding.js';

// Pages with default exports
export { default as ApprovalRequired } from './pages/ApprovalRequired.jsx';
export { default as Blocked } from './pages/Blocked.jsx';
export { default as Dashboard } from './pages/Dashboard.jsx';
export { default as Explore } from './pages/Explore.jsx';
export { default as FundDetail } from './pages/FundDetail.jsx';
export { default as GrievanceRedressal } from './pages/GrievanceRedressal.jsx';
export { default as InvestorCharter } from './pages/InvestorCharter.jsx';
export { default as KycDetail } from './pages/KycDetail.jsx';
export { default as Legal } from './pages/Legal.jsx';
export { default as Login } from './pages/Login.jsx';
export { default as LumpsumSheet } from './pages/LumpsumSheet.jsx';
export { default as MandateAuth } from './pages/MandateAuth.jsx';
export { default as MandateDetail } from './pages/MandateDetail.jsx';
export { default as Notifications } from './pages/Notifications.jsx';
export { default as PaymentStatus } from './pages/PaymentStatus.jsx';
export { default as Portfolio } from './pages/Portfolio.jsx';
export { default as Profile } from './pages/Profile.jsx';
export { default as Security } from './pages/Security.jsx';
export { default as Splash } from './pages/Splash.jsx';
export { default as StartSipSheet } from './pages/StartSipSheet.jsx';
export { default as Statements } from './pages/Statements.jsx';
export { default as Support } from './pages/Support.jsx';
export { default as Transactions } from './pages/Transactions.jsx';
export { default as WithdrawalRequests } from './pages/WithdrawalRequests.jsx';
