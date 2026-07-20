import React from 'react';
import './android-frame.css';

// Android.jsx — Simplified Android (Material 3) device frame
// Status bar + top app bar + content + gesture nav + keyboard.
// Based on Figma M3 spec. No dependencies, no image assets.

const MD_C = {
  surface: '#f4fbf8',
  onSurface: '#171d1b',
  frameBorder: 'rgba(116,119,117,0.5)',
};

// ─────────────────────────────────────────────────────────────
// Status bar (time left, wifi/cell/battery right)
// ─────────────────────────────────────────────────────────────
function AndroidStatusBar({ dark = false }: any) {
  const c = dark ? '#fff' : MD_C.onSurface;
  return (
    <div className="android-status-bar" style={{ '--android-fg': c }}>
      {/* time left */}
      <div className="android-status-bar__time-slot">
        <span className="android-status-bar__time">9:30</span>
      </div>
      {/* camera punch-hole (center) */}
      <div className="android-status-bar__punch" />
      {/* status icons right */}
      <div className="android-status-bar__icons">
        <div className="android-status-bar__icon-group">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 13.3L.67 5.97a10.37 10.37 0 0114.66 0L8 13.3z" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M14.67 14.67V1.33L1.33 14.67h13.34z" />
          </svg>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="3.75" y="2" width="8.5" height="13" rx="1.5" />
          <rect x="5.5" y="0.9" width="5" height="2" rx="0.5" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top app bar (Material 3 small/medium)
// ─────────────────────────────────────────────────────────────
function AndroidAppBar({ title = 'Title', large = false }: any) {
  const iconDot = (
    <div className="android-app-bar__icon">
      <div className="android-app-bar__icon-dot" />
    </div>
  );
  return (
    <div className="android-app-bar">
      <div className="android-app-bar__row">
        {iconDot}
        {!large && (
          <span className="android-app-bar__title">{title}</span>
        )}
        {large && <div className="android-flex-spacer" />}
        {iconDot}
      </div>
      {large && (
        <div className="android-app-bar__title android-app-bar__title--large">{title}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// List item (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidListItem({ headline, supporting, leading }: any) {
  return (
    <div className="android-list-item">
      {leading && (
        <div className="android-list-item__leading">{leading}</div>
      )}
      <div className="android-list-item__content">
        <div className="android-list-item__headline">{headline}</div>
        {supporting && (
          <div className="android-list-item__supporting">{supporting}</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Gesture nav bar (pill)
// ─────────────────────────────────────────────────────────────
function AndroidNavBar({ dark = false }: any) {
  const c = dark ? '#fff' : MD_C.onSurface;
  return (
    <div className="android-nav-bar">
      <div className="android-nav-bar__pill" style={{ '--android-fg': c }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Device frame — wraps everything
// ─────────────────────────────────────────────────────────────
function AndroidDevice({
  children, width = 412, height = 892, dark = false,
  title, large = false, keyboard = false,
}: any) {
  return (
    <div
      className="android-device"
      style={{
        width,
        height,
        '--android-bg': dark ? '#1d1b20' : MD_C.surface,
      }}
    >
      <AndroidStatusBar dark={dark} />
      {title !== undefined && <AndroidAppBar title={title} large={large} />}
      <div className="android-device__content">
        {children}
      </div>
      {keyboard && <AndroidKeyboard />}
      <AndroidNavBar dark={dark} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — Gboard (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidKeyboard() {
  let _k = 0;
  const key = (l, { flex = 1, variant = '', minW }: any = {}) => {
    const className = ['android-keyboard__key', variant && `android-keyboard__key--${variant}`].filter(Boolean).join(' ');
    return (
      <div key={_k++} className={className} style={{ flex, minWidth: minW }}>{l}</div>
    );
  };
  const row = (keys, className = '') => (
    <div className={`android-keyboard__row ${className}`}>
      {keys.map(l => key(l))}
    </div>
  );
  return (
    <div className="android-keyboard">
      {/* navbar spacer (icons omitted) */}
      <div className="android-keyboard__spacer" />
      {/* key rows */}
      <div className="android-keyboard__rows">
        {row(['q','w','e','r','t','y','u','i','o','p'])}
        {row(['a','s','d','f','g','h','j','k','l'], 'android-keyboard__row--indented')}
        <div className="android-keyboard__row">
          {key('', { variant: 'variant' })}
          <div className="android-keyboard__letter-group">
            {['z','x','c','v','b','n','m'].map(l => key(l))}
          </div>
          {key('', { variant: 'variant' })}
        </div>
        <div className="android-keyboard__row">
          {key('?123', { variant: 'action', minW: 58 })}
          {key(',', { variant: 'variant' })}
          {key('', { flex: 3, minW: 154 })}
          {key('.', { variant: 'variant' })}
          {key('', { variant: 'primary', minW: 58 })}
        </div>
      </div>
    </div>
  );
}

export {
  AndroidDevice, AndroidStatusBar, AndroidAppBar, AndroidListItem, AndroidNavBar, AndroidKeyboard,
};
