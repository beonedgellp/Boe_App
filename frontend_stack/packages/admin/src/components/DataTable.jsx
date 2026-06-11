import React, { useMemo } from 'react';
import EmptyTableRow from './EmptyTableRow.jsx';

/**
 * DataTable — responsive table that switches to a card view on mobile.
 *
 * Columns define how each row is rendered. Column headers are used to
 * auto-generate `data-label` attributes for the mobile card view, so each
 * cell shows its label without duplicating markup.
 *
 * Example:
 *   <DataTable
 *     columns={[
 *       { key: 'name', title: 'Course', render: (c) => c.name },
 *       { key: 'price', title: 'Price', render: (c) => formatPrice(c.pricePaise), align: 'right' },
 *     ]}
 *     rows={courses}
 *     loading={loading}
 *     empty="No courses yet"
 *     onRowClick={(c) => setEditing(c)}
 *   />
 */
export default function DataTable({
  columns,
  rows,
  loading = false,
  empty,
  skeletonRows = 4,
  keyExtractor = (row, index) => row?.id ?? index,
  onRowClick,
  getRowProps,
}) {
  const labels = useMemo(() => columns.map((c) => c.title ?? ''), [columns]);

  const showEmptyNode = !loading && rows.length === 0 && empty && typeof empty !== 'string';

  return (
    <div className="ash-table-wrap">
      <table className="ash-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.className}
                style={{ textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left' }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 && Array.from({ length: skeletonRows }, (_, index) => (
            <tr key={index} aria-hidden="true">
              {columns.map((col) => (
                <td key={col.key} data-label={col.title}>
                  <div className="ash-skel" />
                </td>
              ))}
            </tr>
          ))}
          {!loading && rows.length === 0 && typeof empty === 'string' && (
            <EmptyTableRow colSpan={columns.length}>{empty}</EmptyTableRow>
          )}
          {rows.map((row, rowIndex) => {
            const rowProps = getRowProps?.(row, rowIndex) || {};
            const clickable = Boolean(onRowClick);
            return (
              <tr
                key={keyExtractor(row, rowIndex)}
                {...rowProps}
                className={[
                  clickable ? 'is-clickable' : '',
                  rowProps.className || '',
                ].filter(Boolean).join(' ')}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={
                  clickable
                    ? (event) => { if (event.key === 'Enter') onRowClick(row); }
                    : undefined
                }
              >
                {columns.map((col, colIndex) => {
                  const cell = col.render(row, rowIndex);
                  return (
                    <td
                      key={col.key}
                      data-label={labels[colIndex]}
                      className={col.cellClassName}
                      style={{ textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left' }}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {showEmptyNode && empty}
    </div>
  );
}
