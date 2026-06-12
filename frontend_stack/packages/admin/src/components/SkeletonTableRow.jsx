import './SkeletonTableRow.css';

function SkeletonTableRow({ columnCount, colSpan }) {
  // Legacy callers passed `colSpan` to describe the number of columns.
  const count = columnCount ?? colSpan ?? 6;
  return (
    <tr aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const width = index === 0 ? 'var(--be-space-4)' : `${Math.max(40, 100 - index * 12)}%`;
        return (
          <td key={index} className={index === 0 ? 'adm-col-checkbox' : undefined}>
            <div
              className="adm-skeleton adm-skeleton-inline skeleton-table-row__bar"
              style={{ '--adm-skeleton-col-width': width }}
            />
          </td>
        );
      })}
    </tr>
  );
}

export default SkeletonTableRow;
