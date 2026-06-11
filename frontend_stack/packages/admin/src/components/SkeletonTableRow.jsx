function SkeletonTableRow({ columnCount, colSpan }) {
  // Legacy callers passed `colSpan` to describe the number of columns.
  const count = columnCount ?? colSpan ?? 6;
  return (
    <tr aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <td key={index} className={index === 0 ? 'adm-col-checkbox' : undefined}>
          <div
            className="adm-skeleton adm-skeleton-inline"
            style={{
              width: index === 0 ? 14 : `${Math.max(40, 100 - index * 12)}%`,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export default SkeletonTableRow;
