export { default as ClientApp } from './ClientApp.tsx';

// Layout primitives
export { default as Screen } from './layout/Screen.tsx';
export { default as PageHeader } from './layout/PageHeader.tsx';
export { default as Section } from './layout/Section.tsx';
export { default as Card } from './layout/Card.tsx';
export { MetricGrid, Metric } from './layout/MetricGrid.tsx';
export { default as ActionBar } from './layout/ActionBar.tsx';
export { default as BottomSheet } from './layout/BottomSheet.tsx';

export { SessionProvider, useSession } from './store/SessionContext.tsx';
export { AdminSessionProvider, useAdminSession } from './store/AdminSessionContext.tsx';

export {
  apiRequest,
  useHttpApi,
  serviceMode,
} from './services/_util.ts';

export {
  login,
  signup,
  logout,
  currentUser,
  listPendingApprovals,
  checkReachability,
  hasRole,
} from './services/authApi.ts';

export {
  isApprovedUser,
  isPendingApprovalUser,
  isTerminalAccount,
  isExecutionRoute,
  approvalRef,
} from './utils/approval.ts';

export {
  fmtMoney,
  formatMoney,
  fmtNum,
  fmtPct,
  fmtUnits,
  fmtDate,
  relativeDay,
} from './utils/format.ts';

export { openRazorpayCheckout } from './utils/razorpay.ts';
export { openOnboarding } from './utils/openOnboarding.ts';

// Pages with default exports
export { default as ApprovalRequired } from './pages/ApprovalRequired.tsx';
export { default as Blocked } from './pages/Blocked.tsx';
export { default as Dashboard } from './pages/Dashboard.tsx';
export { default as Explore } from './pages/Explore.tsx';
export { default as FundDetail } from './pages/FundDetail.tsx';
export { default as GrievanceRedressal } from './pages/GrievanceRedressal.tsx';
export { default as InvestorCharter } from './pages/InvestorCharter.tsx';
export { default as KycDetail } from './pages/KycDetail.tsx';
export { default as Legal } from './pages/Legal.tsx';
export { default as Login } from './pages/Login.tsx';
export { default as LumpsumSheet } from './pages/LumpsumSheet.tsx';
export { default as MandateAuth } from './pages/MandateAuth.tsx';
export { default as MandateDetail } from './pages/MandateDetail.tsx';
export { default as Notifications } from './pages/Notifications.tsx';
export { default as PaymentStatus } from './pages/PaymentStatus.tsx';
export { default as Portfolio } from './pages/Portfolio.tsx';
export { default as Profile } from './pages/Profile.tsx';
export { default as Security } from './pages/Security.tsx';
export { default as Splash } from './pages/Splash.tsx';
export { default as StartSipSheet } from './pages/StartSipSheet.tsx';
export { default as Statements } from './pages/Statements.tsx';
export { default as Support } from './pages/Support.tsx';
export { default as Transactions } from './pages/Transactions.tsx';
export { default as WithdrawalRequests } from './pages/WithdrawalRequests.tsx';
