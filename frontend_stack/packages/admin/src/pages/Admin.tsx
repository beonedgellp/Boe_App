import { Routes, Route, Navigate } from 'react-router-dom';
import AdminShell from '../layout/AdminShell.tsx';
import LegacyTabRedirect from './LegacyTabRedirect.tsx';
import OverviewPage from './OverviewPage.tsx';
import {
  ApprovalsRoute,
  MandatesRoute,
  PaymentsRoute,
  UserDirectoryRoute,
  UserDetailRoute,
  KycRoute,
  RiskProfilesRoute,
  FundsRoute,
  HoldingsRoute,
  TransactionsRoute,
  LedgerRoute,
  SipControlRoute,
  AppBuilderRoute,
  SupportRoute,
  AuditLogRoute,
  EnvironmentRoute,
} from './legacy/legacyRoutes.tsx';
import CoursesPage from '../features/site/CoursesPage.tsx';
import PlansPage from '../features/site/PlansPage.tsx';
import FaqsPage from '../features/site/FaqsPage.tsx';
import LandingContentPage from '../features/site/LandingContentPage.tsx';
import '../styles/desktop/admin.css';
import '../styles/desktop/shell.css';
import '../styles/desktop/site.css';

export default function Admin() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<LegacyTabRedirect />} />
        <Route path="overview" element={<OverviewPage />} />

        <Route path="users/approvals" element={<ApprovalsRoute />} />
        <Route path="users/subscriptions" element={<MandatesRoute />} />
        <Route path="users/payments" element={<PaymentsRoute />} />
        <Route path="users/directory" element={<UserDirectoryRoute />} />
        <Route path="users/directory/:userId" element={<UserDetailRoute />} />
        <Route path="users/kyc" element={<KycRoute />} />
        <Route path="users/risk-profiles" element={<RiskProfilesRoute />} />

        <Route path="site/content" element={<LandingContentPage />} />
        <Route path="site/courses" element={<CoursesPage />} />
        <Route path="site/plans" element={<PlansPage />} />
        <Route path="site/faqs" element={<FaqsPage />} />

        <Route path="app/builder" element={<AppBuilderRoute />} />

        <Route path="ops/funds" element={<FundsRoute />} />
        <Route path="ops/holdings" element={<HoldingsRoute />} />
        <Route path="ops/transactions" element={<TransactionsRoute />} />
        <Route path="ops/ledger" element={<LedgerRoute />} />
        <Route path="ops/sip-control" element={<SipControlRoute />} />

        <Route path="system/support" element={<SupportRoute />} />
        <Route path="system/audit-log" element={<AuditLogRoute />} />
        <Route path="system/environment" element={<EnvironmentRoute />} />

        <Route path="*" element={<Navigate to="/admin/overview" replace />} />
      </Route>
    </Routes>
  );
}
