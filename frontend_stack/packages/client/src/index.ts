export { default as ClientApp } from './ClientApp';

// Layout primitives
export { default as Screen } from './layout/Screen';
export { default as PageHeader } from './layout/PageHeader';
export { default as Section } from './layout/Section';
export { default as Card } from './layout/Card';
export { MetricGrid, Metric } from './layout/MetricGrid';
export { default as ActionBar } from './layout/ActionBar';
export { default as BottomSheet } from './layout/BottomSheet';

export { SessionProvider, useSession } from './store/SessionContext';
export { AdminSessionProvider, useAdminSession } from './store/AdminSessionContext';

export {
  apiRequest,
  useHttpApi,
  serviceMode,
} from './services/_util';

export {
  login,
  signup,
  logout,
  currentUser,
  listPendingApprovals,
  checkReachability,
  hasRole,
} from './services/authApi';

export {
  isApprovedUser,
  isPendingApprovalUser,
  isTerminalAccount,
  isExecutionRoute,
  approvalRef,
} from './utils/approval';

export {
  fmtMoney,
  formatMoney,
  fmtNum,
  fmtPct,
  fmtUnits,
  fmtDate,
  relativeDay,
} from './utils/format';

export { openRazorpayCheckout } from './utils/razorpay';
export { openOnboarding } from './utils/openOnboarding';

// Pages with default exports
export { default as ApprovalRequired } from './pages/ApprovalRequired';
export { default as Blocked } from './pages/Blocked';
export { default as Dashboard } from './pages/Dashboard';
export { default as Explore } from './pages/Explore';
export { default as FundDetail } from './pages/FundDetail';
export { default as GrievanceRedressal } from './pages/GrievanceRedressal';
export { default as InvestorCharter } from './pages/InvestorCharter';
export { default as KycDetail } from './pages/KycDetail';
export { default as Legal } from './pages/Legal';
export { default as Login } from './pages/Login';
export { default as LumpsumSheet } from './pages/LumpsumSheet';
export { default as MandateAuth } from './pages/MandateAuth';
export { default as MandateDetail } from './pages/MandateDetail';
export { default as Notifications } from './pages/Notifications';
export { default as PaymentStatus } from './pages/PaymentStatus';
export { default as Portfolio } from './pages/Portfolio';
export { default as Profile } from './pages/Profile';
export { default as Security } from './pages/Security';
export { default as Splash } from './pages/Splash';
export { default as StartSipSheet } from './pages/StartSipSheet';
export { default as Statements } from './pages/Statements';
export { default as Support } from './pages/Support';
export { default as Transactions } from './pages/Transactions';
export { default as WithdrawalRequests } from './pages/WithdrawalRequests';
