import { useParams } from 'react-router-dom';
import { useLegacyAdminData } from '../../context/LegacyAdminDataContext';
import ApprovalsScreen from '../../screens/ApprovalsScreen';
import AumScreen from '../../screens/AumScreen';
import AppBuilderScreen from '../../screens/AppBuilderScreen';
import AuditLogScreen from '../../screens/AuditLogScreen';
import EnvironmentScreen from '../../screens/EnvironmentScreen';
import HoldingsScreen from '../../screens/HoldingsScreen';
import KycReviewScreen from '../../screens/KycReviewScreen';
import LedgerScreen from '../../screens/LedgerScreen';
import SipControlScreen from '../../screens/SipControlScreen';
import MandatesScreen from '../../screens/MandatesScreen';
import PaymentsScreen from '../../screens/PaymentsScreen';
import TransactionsScreen from '../../screens/TransactionsScreen';
import RiskProfilesScreen from '../../screens/RiskProfilesScreen';
import SupportTicketsScreen from '../../screens/SupportTicketsScreen';
import UserDetailScreen from '../../screens/UserDetailScreen';
import UserDetailsListScreen from '../../screens/UserDetailsListScreen';

// Thin route wrappers: each mounts a pre-redesign screen with the exact
// props it received from the old monolithic Admin.jsx. They disappear one
// by one as domains get their full rebuild passes.

export function ApprovalsRoute() {
  const ctx = useLegacyAdminData();
  return (
    <ApprovalsScreen
      rows={ctx.adminData.approvals}
      stats={ctx.overview.stats || {}}
      loading={ctx.loading}
      onReview={ctx.openReview}
      onApprove={ctx.handleApproveUser}
      onUserDetail={ctx.openUserDetail}
      onNavigateToUsers={ctx.navigateToUsers}
      busy={ctx.reviewBusy}
    />
  );
}

export function FundsRoute() {
  const ctx = useLegacyAdminData();
  return (
    <AumScreen
      funds={ctx.adminData.funds}
      auditLogs={ctx.adminData.auditLogs}
      onCreate={ctx.handleCreateFund}
      onUpdate={ctx.handleUpdateFund}
      onDelete={ctx.handleDeleteFund}
      onUserDetail={ctx.openUserDetail}
    />
  );
}

export function PaymentsRoute() {
  const ctx = useLegacyAdminData();
  return (
    <PaymentsScreen
      rows={ctx.adminData.payments}
      funds={ctx.adminData.funds}
      stats={ctx.overview.stats || {}}
      onUserDetail={ctx.openUserDetail}
      onApprovePayment={ctx.handleApprovePayment}
      onRejectPayment={ctx.handleRejectPayment}
      busyPaymentId={ctx.paymentBusyId}
      paymentActionError={ctx.paymentActionError}
    />
  );
}

export function MandatesRoute() {
  const ctx = useLegacyAdminData();
  return (
    <MandatesScreen
      rows={ctx.adminData.mandates}
      stats={ctx.overview.stats || {}}
      onUserDetail={ctx.openUserDetail}
    />
  );
}

export function UserDirectoryRoute() {
  const ctx = useLegacyAdminData();
  return <UserDetailsListScreen onUserDetail={ctx.openUserDetail} />;
}

export function UserDetailRoute() {
  const { userId } = useParams();
  return <UserDetailScreen userId={userId} />;
}

export function KycRoute() {
  const ctx = useLegacyAdminData();
  return (
    <KycReviewScreen
      rows={ctx.adminData.kycReview}
      stats={ctx.overview.stats || {}}
      loading={ctx.loading}
      onUserDetail={ctx.openUserDetail}
    />
  );
}

export function RiskProfilesRoute() {
  const ctx = useLegacyAdminData();
  return (
    <RiskProfilesScreen
      rows={ctx.adminData.riskProfiles}
      loading={ctx.loading}
      onUserDetail={ctx.openUserDetail}
    />
  );
}

export function SipControlRoute() {
  return <SipControlScreen />;
}

export function AuditLogRoute() {
  const ctx = useLegacyAdminData();
  return <AuditLogScreen rows={ctx.adminData.auditLogs} loading={ctx.loading} />;
}

export function SupportRoute() {
  const ctx = useLegacyAdminData();
  return (
    <SupportTicketsScreen
      rows={ctx.adminData.supportTickets}
      loading={ctx.loading}
      onUserDetail={ctx.openUserDetail}
    />
  );
}

export function LedgerRoute() {
  const ctx = useLegacyAdminData();
  return <LedgerScreen rows={ctx.adminData.ledger} loading={ctx.loading} />;
}

export function HoldingsRoute() {
  const ctx = useLegacyAdminData();
  return <HoldingsScreen funds={ctx.adminData.funds} loading={ctx.loading} />;
}

export function TransactionsRoute() {
  const ctx = useLegacyAdminData();
  return <TransactionsScreen funds={ctx.adminData.funds} />;
}

export function AppBuilderRoute() {
  return <AppBuilderScreen />;
}

export function EnvironmentRoute() {
  return <EnvironmentScreen />;
}
