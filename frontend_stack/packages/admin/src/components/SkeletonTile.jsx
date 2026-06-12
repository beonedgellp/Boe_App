import './SkeletonTile.css';

function SkeletonTile() {
  return (
    <div className="adm-stat skeleton-tile">
      <div className="adm-skeleton skeleton-tile__bar skeleton-tile__bar--label" />
      <div className="adm-skeleton skeleton-tile__bar skeleton-tile__bar--value" />
    </div>
  );
}

export default SkeletonTile;
