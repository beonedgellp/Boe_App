function SkeletonTile() {
  return (
    <div className="adm-stat">
      <div className="adm-skeleton" style={{ height: 10, width: '60%', marginBottom: 12, borderRadius: 4 }} />
      <div className="adm-skeleton" style={{ height: 28, width: '40%', borderRadius: 4 }} />
    </div>
  );
}

export default SkeletonTile;
