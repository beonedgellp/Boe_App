import React, { useMemo } from 'react';
import { StickyActionBar } from '@beonedge/shared';
import EmptyTableRow from './EmptyTableRow.jsx';
import IndeterminateCheckbox from './IndeterminateCheckbox.jsx';
import './DataTable.css';

/**
 * DataTable — responsive table that switches to a card view on mobile.
 *
 * Columns define how each row is rendered. Column headers are used to
 * auto-generate `data-label` attributes for the mobile card view, so each
 * cell shows its label without duplicating markup.
 *
 * `renderCell` is the preferred column renderer; `render` is kept for
 * backward compatibility.
 *
 * Example:
 *   <DataTable
 *     columns={[
 *       { key: 'name', title: 'Course', renderCell: (c) => <UserCell name={c.name} /> },
 *       { key: 'price', title: 'Price', renderCell: (c) => <CurrencyCell amount={c.pricePaise / 100} />, align: 'right' },
 *       { key: 'updated', title: 'Updated', renderCell: (c) => <DateCell date={c.updatedAt} /> },
 *     ]}
 *     rows={courses}
 *     loading={loading}
 *     empty="No courses yet"
 *     onRowClick={(c) => setEditing(c)}
 *   />
 */

function alignClass(align) {
  if (align === 'right') return 'adm-align-right';
  if (align === 'center') return 'adm-align-center';
  return 'adm-align-left';
}

function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}
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
        <StickyActionBar actions={bulkActions}>
          <span>{selectedCount} selected</span>
        </StickyActionBar>
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
                className={classNames(col.className, alignClass(col.align))}
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
                  const renderFn = col.renderCell ?? col.render;
                  const cell = renderFn ? renderFn(row, rowIndex) : null;
                  return (
                    <td
                      key={col.key}
                      data-label={labels[colIndex + (selectionEnabled ? 1 : 0)]}
                      className={classNames(col.cellClassName, alignClass(col.align))}
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
