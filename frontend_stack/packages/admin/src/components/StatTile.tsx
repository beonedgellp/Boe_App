import I from './I';
function StatTile({ label, value, delta, deltaTone, hint, icon, tone }: any) {
  return (
    <div className={`adm-stat adm-stat--${tone || ''}`}>
      <div className="adm-stat-top">
        <div className="be-eyebrow">{label}</div>
        {icon && (
          <div className={`adm-stat-icon adm-stat-icon--${tone || ''}`}>
            <I icon={icon} size={18} />
          </div>
        )}
      </div>
      <div className="adm-stat-value be-money">{value}</div>
      {delta && <div className={`adm-stat-delta be-num ${deltaTone || ''}`}>{delta}</div>}
      {hint && <div className="adm-stat-hint">{hint}</div>}
    </div>
  );
}

export default StatTile;
