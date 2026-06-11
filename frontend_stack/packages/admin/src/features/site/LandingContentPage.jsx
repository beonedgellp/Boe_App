import { useMemo, useState, useRef, useEffect } from 'react';
import { Braces, UploadCloud, Monitor } from 'lucide-react';
import useLandingConfig from '../../hooks/useLandingConfig.js';
import { LANDING_SECTION_LIST } from './landingDefaults.js';
import { lintLandingConfig } from './contentLint.js';
import Drawer from '../../layout/Drawer.jsx';
import { useToast } from '../../components/ToastProvider.jsx';
import I from '../../components/I.jsx';
import HeroSection from './content/HeroSection.jsx';
import ExploreSection from './content/ExploreSection.jsx';
import SocialProofSection from './content/SocialProofSection.jsx';
import BenefitsSection from './content/BenefitsSection.jsx';
import LearningSection from './content/LearningSection.jsx';
import NewsSection from './content/NewsSection.jsx';
import LeadFormSection from './content/LeadFormSection.jsx';
import NavSection from './content/NavSection.jsx';
import MetaSection from './content/MetaSection.jsx';

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

const PREVIEW_URL = import.meta.env.VITE_BEO_LANDING_PREVIEW_URL || 'http://localhost:3110/preview';
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
  const iframeRef = useRef(null);
  const { addToast } = useToast();

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
      <div className="ash-page">
        <div className="ash-content-layout">
          <div className="ash-skel-block" style={{ minHeight: 320 }} aria-hidden="true" />
          <div className="ash-skel-block" style={{ minHeight: 480 }} aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ash-page">
        <div className="ash-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="ash-btn ash-btn-secondary ash-btn-sm" onClick={reload}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ash-page">
      <div className="ash-content-layout">
        <nav className="ash-content-rail" aria-label="Landing page sections">
          {LANDING_SECTION_LIST.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`ash-content-rail-item ${activeSection === section.id ? 'is-active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span>{section.label}</span>
              {dirtySections.has(section.id) && <span className="ash-dirty-dot" title="Unpublished edits" />}
            </button>
          ))}
        </nav>

        <div className="ash-content-editor">
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

          <div className="ash-publish-bar">
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

        {showPreview && (
          <div className="ash-preview-panel">
            <div className="ash-preview-header">
              <span><I icon={Monitor} size={14} /> Live preview</span>
              <button type="button" className="ash-icon-btn" onClick={() => setShowPreview(false)} aria-label="Close preview">×</button>
            </div>
            {previewTimedOut && !previewReady && (
              <div className="ash-preview-offline" role="status">
                <p>Preview unavailable. The landing page is not responding at {PREVIEW_URL}.</p>
                <p>Start it from the landing worktree with npm run dev, then reopen this panel.</p>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={PREVIEW_URL}
              title="Landing page preview"
              className="ash-preview-frame"
            />
          </div>
        )}
      </div>

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
    </div>
  );
}
