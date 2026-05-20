import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminSession } from '@beonedge/client/store/AdminSessionContext.jsx';
import AdminSidebar from '../components/AdminSidebar.jsx';
import AdminTopBar from '../components/AdminTopBar.jsx';
import ApprovalReviewPanel from '../screens/ApprovalReviewPanel.jsx';
import ApprovalsScreen from '../screens/ApprovalsScreen.jsx';
import AumScreen from '../screens/AumScreen.jsx';
import Toast from '../components/Toast.jsx';
import AppBuilderScreen from '../screens/AppBuilderScreen.jsx';
import AuditLogScreen from '../screens/AuditLogScreen.jsx';
import EnvironmentScreen from '../screens/EnvironmentScreen.jsx';
import HoldingsScreen from '../screens/HoldingsScreen.jsx';
import KycReviewScreen from '../screens/KycReviewScreen.jsx';
import LedgerScreen from '../screens/LedgerScreen.jsx';
import SipControlScreen from '../screens/SipControlScreen.jsx';
import MandatesScreen from '../screens/MandatesScreen.jsx';
import PaymentsScreen from '../screens/PaymentsScreen.jsx';
import TransactionsScreen from '../screens/TransactionsScreen.jsx';
import RiskProfilesScreen from '../screens/RiskProfilesScreen.jsx';
import StubScreen from '../screens/StubScreen.jsx';
import SupportTicketsScreen from '../screens/SupportTicketsScreen.jsx';
import UserDetailScreen from '../screens/UserDetailScreen.jsx';
import UserDetailsListScreen from '../screens/UserDetailsListScreen.jsx';
import { apiRequest } from '@beonedge/client/services/_util.js';
import { loadAdminCollection, loadAdminOverview } from '../helpers/loadAdminData.js';
import { TITLES } from '../helpers/titles.js';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';

const EMPTY_OVERVIEW = {
  counts: {},
  stats: {},
};

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('tab') || 'approvals';
  const setActive = (tab) => setSearchParams({ tab });
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [adminData, setAdminData] = useState({
    approvals: [],
    funds: [],
    payments: [],
    mandates: [],
    auditLogs: [],
    kycReview: [],
    riskProfiles: [],
    sipControlRequests: [],
    supportTickets: [],
    ledger: [],
    transactions: [],
  });
  const [loadNote, setLoadNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewRow, setReviewRow] = useState(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [paymentBusyId, setPaymentBusyId] = useState('');
  const [paymentActionError, setPaymentActionError] = useState('');
  const [detailOverlayUserId, setDetailOverlayUserId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const loadRef = useRef(0);
  const navigate = useNavigate();
  const { user, logout } = useAdminSession();
  const meta = TITLES[active] || { title: active.charAt(0).toUpperCase() + active.slice(1), crumbs: ['BeOnEdge', active] };

  async function loadAdminData() {
    const reqId = ++loadRef.current;
    setLoading(true);
    setLoadNote('');
    const results = await Promise.allSettled([
      loadAdminOverview(),
      loadAdminCollection('/v1/admin/approvals'),
      loadAdminCollection('/v1/admin/funds'),
      loadAdminCollection('/v1/admin/payments'),
      loadAdminCollection('/v1/admin/mandates'),
      loadAdminCollection('/v1/admin/audit-logs'),
      loadAdminCollection('/v1/admin/kyc-review'),
      loadAdminCollection('/v1/admin/risk-profiles'),
      loadAdminCollection('/v1/admin/sip-control-requests'),
      loadAdminCollection('/v1/admin/support/tickets'),
      loadAdminCollection('/v1/admin/reconciliation-ledger'),
      loadAdminCollection('/v1/admin/transactions'),
    ]);
    if (reqId !== loadRef.current) return; // ignore stale responses
    const [nextOverview, approvals, funds, payments, mandates, auditLogs, kycReview, riskProfiles, sipControlRequests, supportTickets, ledger, transactions] = results.map((result) => (
      result.status === 'fulfilled' ? result.value : null
    ));
    setOverview(nextOverview || EMPTY_OVERVIEW);
    setAdminData({
      approvals: approvals || [],
      funds: funds || [],
      payments: payments || [],
      mandates: mandates || [],
      auditLogs: auditLogs || [],
      kycReview: kycReview || [],
      riskProfiles: riskProfiles || [],
      sipControlRequests: sipControlRequests || [],
      supportTickets: supportTickets || [],
      ledger: ledger || [],
      transactions: transactions || [],
    });

    const failures = results
      .map((result, index) => (result.status === 'rejected' ? `${['overview', 'approvals', 'funds', 'payments', 'mandates', 'audit-logs', 'kyc-review', 'risk-profiles', 'sip-control-requests', 'support-tickets', 'reconciliation-ledger', 'transactions'][index]}: ${result.reason?.message || 'failed'}` : ''))
      .filter(Boolean);
    if (failures.length > 0) setLoadNote(`Some admin data could not be loaded: ${failures.join('; ')}`);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    loadAdminData().catch((error) => {
      if (!cancelled) setLoadNote(`Admin data could not be loaded: ${error.message}`);
    });
    return () => { cancelled = true };
  }, []);

  async function handleCreateFund(payload) {
    await apiRequest('/v1/admin/funds', { method: 'POST', body: payload, scope: 'admin' });
    await loadAdminData();
  }

  async function handleUpdateFund(fundId, payload) {
    await apiRequest(`/v1/admin/funds/${encodeURIComponent(fundId)}`, { method: 'PATCH', body: payload, scope: 'admin' });
    await loadAdminData();
  }

  async function handleDeleteFund(fundId) {
    await apiRequest(`/v1/admin/funds/${encodeURIComponent(fundId)}`, { method: 'DELETE', scope: 'admin' });
    await loadAdminData();
  }

  function openReview(row) {
    setReviewRow(row);
    setReviewReason('');
    setReviewError('');
  }

  function closeReview() {
    if (reviewBusy) return;
    setReviewRow(null);
    setReviewReason('');
    setReviewError('');
  }

  function addToast(message, type = 'success', duration = 4000) {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  async function handleUserDecision(row, status) {
    if (!row?.id) return;
    if (reviewBusy) return;
    const reason = reviewReason.trim();
    if (status === 'rejected' && !reason) {
      setReviewError('A rejection note is required.');
      return;
    }
    setReviewBusy(true);
    setReviewError('');

    // Optimistic UI: remove row from approvals immediately
    setAdminData((prev) => ({
      ...prev,
      approvals: prev.approvals.filter((a) => a.id !== row.id),
    }));

    try {
      const result = await apiRequest(`/v1/admin/users/${encodeURIComponent(row.id)}/status`, {
        method: 'PATCH',
        body: {
          status,
          reason: reason || (status === 'approved' ? 'Approved from admin dashboard.' : 'Rejected from admin dashboard.'),
        },
        scope: 'admin',
      });
      setReviewRow(null);
      setReviewReason('');

      // Update sidebar badge count from response
      if (result?.pendingCount !== undefined) {
        setOverview((prev) => ({
          ...prev,
          counts: { ...prev.counts, approvals: result.pendingCount },
          stats: { ...prev.stats, pendingApprovals: result.pendingCount },
        }));
      }

      addToast(
        status === 'approved'
          ? `${row.name || 'User'} approved successfully.`
          : `${row.name || 'User'} rejected.`,
        status === 'approved' ? 'success' : 'warning'
      );

      // Background refetch to reconcile
      await loadAdminData();
    } catch (error) {
      setReviewError(error?.message || 'Review action failed.');
      addToast(error?.message || 'Action failed. Please try again.', 'error');
      // Re-add row on error
      setAdminData((prev) => ({
        ...prev,
        approvals: [row, ...prev.approvals],
      }));
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleApproveUser(row) {
    setReviewReason('');
    await handleUserDecision(row, 'approved');
  }

  async function handleApprovePayment(row, payload) {
    if (!row?.id || paymentBusyId) return;
    setPaymentBusyId(row.id);
    setPaymentActionError('');
    try {
      const result = await apiRequest(`/v1/admin/payments/${encodeURIComponent(row.id)}/approve`, {
        method: 'POST',
        body: payload,
        scope: 'admin',
      });
      addToast(`${row.fundName || 'Fund pool'} credited with approved payment.`, 'success');
      await loadAdminData();
      return result;
    } catch (error) {
      const message = error?.message || 'Payment approval failed.';
      setPaymentActionError(message);
      addToast(message, 'error');
      throw error;
    } finally {
      setPaymentBusyId('');
    }
  }

  async function handleRejectPayment(row, payload) {
    if (!row?.id || paymentBusyId) return;
    setPaymentBusyId(row.id);
    setPaymentActionError('');
    try {
      const result = await apiRequest(`/v1/admin/payments/${encodeURIComponent(row.id)}/reject`, {
        method: 'POST',
        body: payload,
        scope: 'admin',
      });
      addToast(`Payment ${row.id} rejected.`, 'warning');
      await loadAdminData();
      return result;
    } catch (error) {
      const message = error?.message || 'Payment rejection failed.';
      setPaymentActionError(message);
      addToast(message, 'error');
      throw error;
    } finally {
      setPaymentBusyId('');
    }
  }

  function openUserDetail(rowOrId) {
    const id = rowOrId?.userId || rowOrId?.user_id || rowOrId?.id || rowOrId;
    if (id) setDetailOverlayUserId(id);
  }

  function closeUserDetailOverlay() {
    setDetailOverlayUserId(null);
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="adm-app" data-screen-label="Admin Console">
      <AdminSidebar active={active} onChange={setActive} user={user} counts={overview.counts || {}} />
      <main className="adm-main">
        <AdminTopBar title={meta.title} breadcrumbs={meta.crumbs} onLogout={handleLogout}/>
        {loadNote && (
          <div className="adm-load-note">{loadNote}</div>
        )}
        {active === 'approvals' && <ApprovalsScreen rows={adminData.approvals} stats={overview.stats || {}} loading={loading} onReview={openReview} onApprove={handleApproveUser} onUserDetail={openUserDetail} onNavigateToUsers={() => setActive('userDetail')} busy={reviewBusy}/>}
        {active === 'funds'     && <AumScreen funds={adminData.funds} auditLogs={adminData.auditLogs} onCreate={handleCreateFund} onUpdate={handleUpdateFund} onDelete={handleDeleteFund} onUserDetail={openUserDetail}/>}
        {active === 'payments'  && <PaymentsScreen rows={adminData.payments} funds={adminData.funds} stats={overview.stats || {}} onUserDetail={openUserDetail} onApprovePayment={handleApprovePayment} onRejectPayment={handleRejectPayment} busyPaymentId={paymentBusyId} paymentActionError={paymentActionError}/>}
        {active === 'mandates'  && <MandatesScreen rows={adminData.mandates} stats={overview.stats || {}} onUserDetail={openUserDetail}/>}
        {active === 'appBuilder' && <AppBuilderScreen/>}
        {active === 'userDetail' && searchParams.get('userId') && <UserDetailScreen userId={searchParams.get('userId')} />}
        {active === 'userDetail' && !searchParams.get('userId') && <UserDetailsListScreen onUserDetail={openUserDetail} />}
        {active === 'kyc'       && <KycReviewScreen rows={adminData.kycReview} stats={overview.stats || {}} loading={loading} onUserDetail={openUserDetail}/>}
        {active === 'risk'      && <RiskProfilesScreen rows={adminData.riskProfiles} loading={loading} onUserDetail={openUserDetail}/>}
        {active === 'requests'  && <SipControlScreen />}
        {active === 'audit'     && <AuditLogScreen rows={adminData.auditLogs} loading={loading} />}
        {active === 'support'   && <SupportTicketsScreen rows={adminData.supportTickets} loading={loading} onUserDetail={openUserDetail} />}
        {active === 'ledger'    && <LedgerScreen rows={adminData.ledger} loading={loading} />}
        {active === 'holdings'  && <HoldingsScreen funds={adminData.funds} loading={loading} />}
        {active === 'transactions' && <TransactionsScreen funds={adminData.funds} />}
        {active === 'env'       && <EnvironmentScreen />}
        {!['approvals','funds','payments','mandates','appBuilder','userDetail','kyc','risk','requests','audit','support','ledger','holdings','transactions','env'].includes(active) && <StubScreen title={meta.title}/>}
      </main>
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <ApprovalReviewPanel
        row={reviewRow}
        reason={reviewReason}
        busy={reviewBusy}
        error={reviewError}
        onReasonChange={setReviewReason}
        onClose={closeReview}
        onDecision={handleUserDecision}
      />
      {detailOverlayUserId && (
        <div className="adm-overlay" onClick={closeUserDetailOverlay}>
          <div className="adm-overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-overlay-head">
              <h3>User Detail</h3>
              <button className="adm-icon-btn" onClick={closeUserDetailOverlay}><span className="adm-close-glyph">&times;</span></button>
            </div>
            <UserDetailScreen userId={detailOverlayUserId} />
          </div>
        </div>
      )}
    </div>
  );
}
