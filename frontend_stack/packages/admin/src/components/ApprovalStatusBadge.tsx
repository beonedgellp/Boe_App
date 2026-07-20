function ApprovalStatusBadge({ status }: any) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'active') {
    return <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Approved</span>;
  }
  if (s === 'rejected') {
    return <span className="be-badge be-badge-failed"><span className="be-badge-dot"/>Rejected</span>;
  }
  return <span className="be-badge be-badge-paused"><span className="be-badge-dot"/>Pending</span>;
}

export default ApprovalStatusBadge;
