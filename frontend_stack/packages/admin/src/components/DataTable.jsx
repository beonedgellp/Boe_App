import React, { useMemo } from 'react';
import EmptyTableRow from './EmptyTableRow.jsx';
import IndeterminateCheckbox from './IndeterminateCheckbox.jsx';

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
  selectedIds,
  onSelectRow,
  onSelectAll,
  bulkActions,
}) {
  const selectionEnabled = selectedIds !== undefined;
  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const allSelected = rows.length > 0 && rows.every((row, index) => selectedSet.has(keyExtractor(row, index)));
  const someSelected = rows.some((row, index) => selectedSet.has(keyExtractor(row, index)));

  const selectColumn = { key: '__select', title: '', className: 'adm-col-checkbox', render: () => null };
  const displayColumns = selectionEnabled ? [selectColumn, ...columns] : columns;

  const labels = useMemo(() => displayColumns.map((c) => c.title ?? ''), [displayColumns]);

  const selectedCount = selectedSet.size;
  const showEmptyNode = !loading && rows.length === 0 && empty && typeof empty !== 'string';

  function handleRowKeyDown(event, row) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(row);
    }
  }

  return (
    <div className="ash-table-wrap">
      {selectionEnabled && bulkActions && selectedCount > 0 && (
        <div className="adm-bulk-bar">
          <span className="adm-bulk-count">{selectedCount} selected</span>
          <div className="adm-bulk-actions">{bulkActions}</div>
        </div>
      )}
      <table className="ash-table">
        <thead>
          <tr>
            {selectionEnabled && (
              <th className="adm-col-checkbox">
                <IndeterminateCheckbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={(event) => onSelectAll?.(event.target.checked)}
                  aria-label="Select all rows"
                />
              </th>
            )}
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
              {displayColumns.map((col) => (
                <td key={col.key} data-label={col.title} className={col.className}>
                  <div className="ash-skel" />
                </td>
              ))}
            </tr>
          ))}
          {!loading && rows.length === 0 && typeof empty === 'string' && (
            <EmptyTableRow colSpan={displayColumns.length}>{empty}</EmptyTableRow>
          )}
          {showEmptyNode && (
            <tr className="adm-empty-row">
              <td colSpan={displayColumns.length}>{empty}</td>
            </tr>
          )}
          {rows.map((row, rowIndex) => {
            const rowProps = getRowProps?.(row, rowIndex) || {};
            const id = keyExtractor(row, rowIndex);
            const clickable = Boolean(onRowClick);
            const rowAccessible = clickable && !selectionEnabled;
            return (
              <tr
                key={id}
                {...rowProps}
                className={[
                  clickable ? 'is-clickable' : '',
                  selectedSet.has(id) ? 'is-selected' : '',
                  rowProps.className || '',
                ].filter(Boolean).join(' ')}
                tabIndex={clickable ? 0 : undefined}
                role={rowAccessible ? 'button' : undefined}
                aria-label={rowAccessible ? `Open row ${rowIndex + 1}` : undefined}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={clickable ? (event) => handleRowKeyDown(event, row) : undefined}
              >
                {selectionEnabled && (
                  <td className="adm-col-checkbox" data-label="">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(id)}
                      onChange={(event) => onSelectRow?.(id, event.target.checked)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((col, colIndex) => {
                  const cell = col.render(row, rowIndex);
                  return (
                    <td
                      key={col.key}
                      data-label={labels[colIndex + (selectionEnabled ? 1 : 0)]}
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
    </div>
  );
}
