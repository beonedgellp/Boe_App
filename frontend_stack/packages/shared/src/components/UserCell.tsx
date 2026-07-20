import React from 'react';
import './UserCell.css';

/**
 * UserCell — avatar + name + optional subtext for table cells.
 *
 * Props:
 *   - name: string
 *   - sub: string | ReactNode (optional)
 *   - avatar: ReactNode | string (initials)
 *   - size: 'sm' | 'md' | 'lg' (default 'md')
 *   - fallback: string (shown when name is empty)
 *   - className: string
 */
export default function UserCell({
  name,
  sub,
  avatar,
  size = 'md',
  fallback = 'Unknown',
  className = '',
}: any) {
  const displayName = name || fallback;
  const sizeClass = size === 'sm' || size === 'lg' ? `be-user-cell__avatar--${size}` : '';
  const avatarNode = typeof avatar === 'string'
    ? <span className={`be-user-cell__avatar ${sizeClass}`}>{avatar}</span>
    : avatar;

  return (
    <div className={`be-user-cell be-min-w-0 ${className}`}>
      {avatarNode}
      <div className="be-user-cell__info be-min-w-0">
        <div className="be-user-cell__name">{displayName}</div>
        {sub && <div className="be-user-cell__sub">{sub}</div>}
      </div>
    </div>
  );
}
