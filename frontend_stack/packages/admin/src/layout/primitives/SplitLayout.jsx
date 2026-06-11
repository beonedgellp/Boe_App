import React from 'react';
import './SplitLayout.css';

/**
 * SplitLayout — rail + editor + optional preview panel.
 *
 * Replaces .ash-content-layout and the :has() selector hack.
 * Props-driven layout eliminates the need for CSS :has() and makes
 * the grid explicit and composable.
 */
export default function SplitLayout({
  rail,
  main,
  preview,
  railWidth,
  editorMaxWidth,
  className = '',
}) {
  const hasPreview = Boolean(preview);
  const style = {};
  if (railWidth) style['--split-rail-w'] = railWidth;
  if (editorMaxWidth) style['--split-editor-max'] = editorMaxWidth;

  return (
    <div
      className={`be-split-layout ${hasPreview ? 'has-preview' : ''} ${className}`}
      style={Object.keys(style).length ? style : undefined}
    >
      <aside className="be-split-rail">{rail}</aside>
      <div className="be-split-main">{main}</div>
      {hasPreview && <div className="be-split-preview">{preview}</div>}
    </div>
  );
}
