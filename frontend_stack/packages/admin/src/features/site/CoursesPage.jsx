import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import useAdminCollection from '../../hooks/useAdminCollection.js';
import { formatRupeesFromPaise } from '../../helpers/currency.js';
import { StatusBadge, StatusFilterChips } from './fields.jsx';
import CourseEditorDrawer from './CourseEditorDrawer.jsx';
import DataTable from '../../components/DataTable.jsx';
import I from '../../components/I.jsx';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const NEW_COURSE = {};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CoursesPage() {
  const { items, loading, error, reload } = useAdminCollection('/v1/admin/courses');
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
            <h2 className="ash-card-title">Courses</h2>
            <div className="ash-card-sub">Published courses appear on the landing page course catalogue.</div>
          </div>
          <button type="button" className="ash-btn ash-btn-primary" onClick={() => setEditing(NEW_COURSE)}>
            <I icon={Plus} size={14} />
            New course
          </button>
        </div>

        <div className="ash-card-toolbar">
          <StatusFilterChips value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        </div>

        <DataTable
          columns={[
            {
              key: 'course',
              title: 'Course',
              render: (course) => (
                <>
                  <div className="ash-cell-main">{course.name}</div>
                  <div className="ash-cell-sub ash-cell-mono">{course.slug}</div>
                </>
              ),
            },
            { key: 'level', title: 'Level', render: (course) => course.level },
            { key: 'format', title: 'Format', render: (course) => course.format },
            {
              key: 'price',
              title: 'Price',
              className: 'ash-cell-num',
              render: (course) => (course.pricePaise ? formatRupeesFromPaise(course.pricePaise) : 'Free'),
            },
            {
              key: 'order',
              title: 'Order',
              className: 'ash-cell-num',
              render: (course) => course.sortOrder ?? 0,
            },
            { key: 'status', title: 'Status', render: (course) => <StatusBadge status={course.status} /> },
            {
              key: 'updated',
              title: 'Updated',
              render: (course) => <span className="ash-cell-sub">{formatDate(course.updatedAt)}</span>,
            },
          ]}
          rows={visible}
          loading={loading}
          empty={
            visible.length === 0 && !error ? (
              <div className="ash-empty ash-empty-table">
                <div className="ash-empty-title">
                  {statusFilter === 'all' ? 'No courses yet' : `No ${statusFilter} courses`}
                </div>
                <p className="ash-empty-desc">
                  Courses you create here start as drafts. Publish one and it appears on the public site immediately.
                </p>
                {statusFilter === 'all' && (
                  <button type="button" className="ash-btn ash-btn-primary" onClick={() => setEditing(NEW_COURSE)}>
                    Create the first course
                  </button>
                )}
              </div>
            ) : undefined
          }
          onRowClick={(course) => setEditing(course)}
        />
      </div>

      <CourseEditorDrawer
        open={editing !== null}
        course={editing === NEW_COURSE ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />
    </div>
  );
}
