import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AppBar({ title, leftIcon, onLeft, rightIcon, onRight, rightAriaLabel = 'Action', ...rest }: any) {
  const navigate = useNavigate();
  const Left = leftIcon || ArrowLeft;
  const handleLeft = onLeft || (() => navigate(-1));
  return (
    <header className="apk-appbar" {...rest}>
      <button type="button" className="apk-appbar-icon" aria-label="Back" onClick={handleLeft}>
        <Left size={22} strokeWidth={1.5} />
      </button>
      <div className="apk-appbar-title">{title}</div>
      {rightIcon ? (
        <button type="button" className="apk-appbar-icon" aria-label={rightAriaLabel} onClick={onRight}>
          {React.createElement(rightIcon, { size: 22, strokeWidth: 1.5 })}
        </button>
      ) : (
        <div className="apk-appbar-spacer" />
      )}
    </header>
  );
}
