import { useMemo, useState } from 'react';
import { Plus, Star } from 'lucide-react';
import useAdminCollection from '../../hooks/useAdminCollection.ts';
import { formatRupeesFromPaise } from '../../helpers/currency.ts';
import { StatusBadge, StatusFilterChips } from './fields.tsx';
import PlanEditorDrawer from './PlanEditorDrawer.tsx';
import I from '../../components/I.tsx';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const CADENCE_LABELS = {
  one_time: 'One time',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const NEW_PLAN = {};

export default function PlansPage() {
  const { items, loading, error, reload } = useAdminCollection('/v1/admin/plans');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  const visible = useMemo(() => (
    statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter)
  ), [items, statusFilter]);

  return (
    <div className="ash-page">
      {error && (
        <div className="ash-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="ash-btn ash-btn-secondary ash-btn-sm" onClick={reload}>Retry</button>
        </div>
      )}

      <div className="ash-card">
        <div className="ash-card-head">
          <div>
            <h2 className="ash-card-title">Plans</h2>
            <div className="ash-card-sub">Education plan tiers shown on the landing page pricing section.</div>
          </div>
          <button type="button" className="ash-btn ash-btn-primary" onClick={() => setEditing(NEW_PLAN)}>
            <I icon={Plus} size={14} />
            New plan
          </button>
        </div>

        <div className="ash-card-toolbar">
          <StatusFilterChips value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        </div>

        <div className="ash-table-wrap">
          <table className="ash-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Price</th>
                <th>Cadence</th>
                <th>Features</th>
                <th>Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 3 }, (_, index) => (
                <tr key={index} aria-hidden="true">
                  <td colSpan={6}><div className="ash-skel" /></td>
                </tr>
              ))}
              {!loading && visible.map((plan) => (
                <tr
                  key={plan.id}
                  className="is-clickable"
                  tabIndex={0}
                  role="button"
                  aria-label={`Edit plan ${plan.name}`}
                  onClick={() => setEditing(plan)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setEditing(plan);
                    }
                  }}
                >
                  <td>
                    <div className="ash-cell-main">
                      {plan.name}
                      {plan.featured && <I icon={Star} size={12} className="ash-featured-star" />}
                    </div>
                    <div className="ash-cell-sub">{plan.tagline}</div>
                  </td>
                  <td className="ash-cell-num">{formatRupeesFromPaise(plan.pricePaise)}</td>
                  <td>{CADENCE_LABELS[plan.cadence] || plan.cadence}</td>
                  <td className="ash-cell-num">{Array.isArray(plan.features) ? plan.features.length : 0}</td>
                  <td className="ash-cell-num">{plan.sortOrder ?? 0}</td>
                  <td><StatusBadge status={plan.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && visible.length === 0 && !error && (
            <div className="ash-empty ash-empty-table">
              <div className="ash-empty-title">
                {statusFilter === 'all' ? 'No plans yet' : `No ${statusFilter} plans`}
              </div>
              <p className="ash-empty-desc">
                Plans you create here start as drafts. Publish one and it appears in the landing page pricing section.
              </p>
              {statusFilter === 'all' && (
                <button type="button" className="ash-btn ash-btn-primary" onClick={() => setEditing(NEW_PLAN)}>
                  Create the first plan
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <PlanEditorDrawer
        open={editing !== null}
        plan={editing === NEW_PLAN ? null : editing}
        plans={items}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />
    </div>
  );
}
