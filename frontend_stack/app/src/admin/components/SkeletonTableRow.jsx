function SkeletonTableRow() {
  return (
    <tr>
      <td className="adm-col-checkbox"><div className="adm-skeleton" style={{ height: 14, width: 14 }} /></td>
      <td className="adm-col-user">
        <div className="adm-user">
          <div className="adm-skeleton adm-avatar-sm" style={{ borderRadius: '999px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div className="adm-skeleton" style={{ height: 13, width: 120, borderRadius: 4 }} />
            <div className="adm-skeleton" style={{ height: 11, width: 160, borderRadius: 4 }} />
          </div>
        </div>
      </td>
      <td className="adm-col-date"><div className="adm-skeleton" style={{ height: 11, width: 80, borderRadius: 4 }} /></td>
      <td className="adm-col-status"><div className="adm-skeleton" style={{ height: 20, width: 70, borderRadius: '999px' }} /></td>
      <td className="adm-col-role"><div className="adm-skeleton" style={{ height: 13, width: 60, borderRadius: 4 }} /></td>
      <td className="adm-col-actions">
        <div className="adm-skeleton" style={{ height: 28, width: 64, display: 'inline-block', borderRadius: 4, marginRight: 6 }} />
        <div className="adm-skeleton" style={{ height: 28, width: 64, display: 'inline-block', borderRadius: 4 }} />
      </td>
    </tr>
  );
}

export default SkeletonTableRow;
