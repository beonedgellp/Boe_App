import { useMemo, useState, useRef, useEffect } from 'react';
import { Braces, UploadCloud, Monitor, RotateCw } from 'lucide-react';
import useLandingConfig from '../../hooks/useLandingConfig.ts';
import { LANDING_SECTION_LIST } from './landingDefaults.ts';
import { lintLandingConfig } from './contentLint.ts';
import Drawer from '../../layout/Drawer.tsx';
import { SplitLayout, Page } from '../../layout/primitives/index.ts';
import { useToast } from '../../components/ToastProvider.tsx';
import I from '../../components/I.tsx';
import HeroSection from './content/HeroSection.tsx';
import ExploreSection from './content/ExploreSection.tsx';
import SocialProofSection from './content/SocialProofSection.tsx';
import BenefitsSection from './content/BenefitsSection.tsx';
import LearningSection from './content/LearningSection.tsx';
import NewsSection from './content/NewsSection.tsx';
import LeadFormSection from './content/LeadFormSection.tsx';
import NavSection from './content/NavSection.tsx';
import MetaSection from './content/MetaSection.tsx';
import './LandingContentPage.css';

const SECTION_EDITORS = {
  hero: HeroSection,
  explore: ExploreSection,
  socialProof: SocialProofSection,
  premium: BenefitsSection,
  learningMethod: LearningSection,
  news: NewsSection,
  leadForm: LeadFormSection,
  nav: NavSection,
  meta: MetaSection,
};

function formatPublishedAt(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const PREVIEW_URL = import.meta.env.VITE_BEO_LANDING_PREVIEW_URL || 'http://localhost:3100/preview';
const PREVIEW_ORIGIN = new URL(PREVIEW_URL, window.location.href).origin;
const PREVIEW_READY_TIMEOUT_MS = 4000;

export default function LandingContentPage() {
  const {
    draft, setSection, dirtySections, versionMeta, loading, error, publishing, publish, reload,
  } = useLandingConfig();
  const [activeSection, setActiveSection] = useState('hero');
  const [reason, setReason] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewTimedOut, setPreviewTimedOut] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const iframeRef = useRef(null);
  const { addToast } = useToast();

  function handleEditorFocus(event) {
    const host = event.target.closest('[data-field-desc]');
    if (host) {
      setFocusedField({ label: host.dataset.fieldLabel || '', desc: host.dataset.fieldDesc || '' });
    }
  }

  function reloadPreview() {
    setPreviewReady(false);
    setPreviewTimedOut(false);
    setPreviewKey((key) => key + 1);
  }

  useEffect(() => {
    if (!showPreview || previewReady) return undefined;
    function onPreviewMessage(event) {
      if (event.origin === PREVIEW_ORIGIN && event.data?.type === 'LANDING_PREVIEW_READY') {
        setPreviewReady(true);
        setPreviewTimedOut(false);
      }
    }
    window.addEventListener('message', onPreviewMessage);
    const timer = setTimeout(() => setPreviewTimedOut(true), PREVIEW_READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener('message', onPreviewMessage);
      clearTimeout(timer);
    };
  }, [showPreview, previewReady]);

  useEffect(() => {
    if (!iframeRef.current || !draft || !previewReady) return;
    iframeRef.current.contentWindow?.postMessage(
      { type: 'LANDING_PREVIEW_CONFIG', config: draft },
      PREVIEW_ORIGIN
    );
  }, [draft, previewReady]);

  const warnings = useMemo(() => (draft ? lintLandingConfig(draft) : []), [draft]);
  const isDirty = dirtySections.size > 0;
  const Editor = SECTION_EDITORS[activeSection];

  async function handlePublish() {
    try {
      const result = await publish(reason.trim());
      setReason('');
      addToast(`Version ${result?.version} is live on the landing page.`, 'success');
    } catch (publishError) {
      addToast(publishError?.message || 'Publish failed.', 'error');
    }
  }

  if (loading) {
    return (
      <Page>
        <SplitLayout
          rail={<div className="ash-skel-block landing-content-skeleton--rail" aria-hidden="true" />}
          main={<div className="ash-skel-block landing-content-skeleton--main" aria-hidden="true" />}
        />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div className="ash-error-banner landing-content-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="ash-btn ash-btn-secondary ash-btn-sm" onClick={reload}>Retry</button>
        </div>
      </Page>
    );
  }

  const activeMeta = LANDING_SECTION_LIST.find((section) => section.id === activeSection);

  const rail = (
    <div className="ash-content-rail-stack">
      <nav className="ash-content-rail" aria-label="Landing page sections">
        {LANDING_SECTION_LIST.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`ash-content-rail-item ${activeSection === section.id ? 'is-active' : ''}`}
            onClick={() => { setActiveSection(section.id); setFocusedField(null); }}
          >
            <span>{section.label}</span>
            {dirtySections.has(section.id) && <span className="ash-dirty-dot" title="Unpublished edits" />}
          </button>
        ))}
      </nav>
      <aside className="ash-section-desc" aria-live="polite">
        <h3 className="ash-section-desc-title">{focusedField?.label ? `Description — ${focusedField.label}` : 'Description'}</h3>
        <p className="ash-section-desc-body">{focusedField?.desc || activeMeta?.description}</p>
      </aside>
    </div>
  );

  const main = (
    <div className="ash-content-editor" onFocusCapture={handleEditorFocus}>
      {Editor && (
        <Editor
          value={draft?.[activeSection]}
          onChange={(next) => setSection(activeSection, next)}
        />
      )}

      {warnings.length > 0 && (
        <div className="ash-publish-warnings" role="status">
          <strong>Review before publishing</strong>
          {warnings.slice(0, 6).map((warning) => (
            <span key={`${warning.path}-${warning.message}`}>{warning.path}: {warning.message}</span>
          ))}
          {warnings.length > 6 && <span>{warnings.length - 6} more warnings in other fields.</span>}
        </div>
      )}

      <div className="ash-publish-bar landing-content-publish-bar">
        <div className="ash-publish-meta">
          {versionMeta.version
            ? <>Version {versionMeta.version}, published {formatPublishedAt(versionMeta.publishedAt)}</>
            : 'Nothing published yet. The landing page shows its built-in content until the first publish.'}
          {isDirty && <> · {dirtySections.size} section{dirtySections.size > 1 ? 's' : ''} edited</>}
        </div>
        <div className="ash-publish-actions">
          <button type="button" className="ash-btn ash-btn-ghost ash-btn-sm" onClick={() => setShowJson(true)}>
            <I icon={Braces} size={13} />
            View JSON
          </button>
          <input
            className="ash-input ash-publish-reason"
            value={reason}
            placeholder="Reason (optional)"
            aria-label="Publish reason"
            onChange={(event) => setReason(event.target.value)}
          />
          <button
            type="button"
            className={`ash-btn ash-btn-primary ${publishing ? 'is-loading' : ''}`}
            onClick={handlePublish}
            disabled={!isDirty || publishing}
          >
            <I icon={UploadCloud} size={14} />
            Publish
          </button>
        </div>
      </div>
    </div>
  );

  const preview = showPreview ? (
    <>
      <div className="ash-preview-header">
        <span><I icon={Monitor} size={14} /> Preview</span>
        <div className="ash-preview-header-actions">
          <button type="button" className="ash-btn ash-btn-ghost ash-btn-sm" onClick={reloadPreview}>
            <I icon={RotateCw} size={13} />
            Reload
          </button>
          <button type="button" className="ash-icon-btn" onClick={() => setShowPreview(false)} aria-label="Close preview">×</button>
        </div>
      </div>
      {previewTimedOut && !previewReady && (
        <div className="ash-preview-offline" role="status">
          <p>Preview unavailable. The landing page is not responding at {PREVIEW_URL}.</p>
          <p>Start it from the landing worktree with npm run dev, then reopen this panel.</p>
        </div>
      )}
      <iframe
        key={previewKey}
        ref={iframeRef}
        src={PREVIEW_URL}
        title="Landing page preview"
        className="ash-preview-frame"
        sandbox="allow-scripts allow-same-origin"
      />
    </>
  ) : null;

  return (
    <Page>
      <SplitLayout
        rail={rail}
        main={main}
        preview={preview}
        className="is-preview-wide"
        railWidth="200px"
        editorMaxWidth="440px"
      />

      {!showPreview && (
        <button
          type="button"
          className="ash-preview-toggle"
          onClick={() => setShowPreview(true)}
          aria-label="Show live preview"
        >
          <I icon={Monitor} size={16} />
        </button>
      )}

      <Drawer open={showJson} title="Landing configuration JSON" onClose={() => setShowJson(false)} wide>
        <pre className="ash-json-view">{JSON.stringify(draft, null, 2)}</pre>
      </Drawer>
    </Page>
  );
}
