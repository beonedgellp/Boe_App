import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppBar from '../layout/AppBar.tsx';
import Skeleton from '@beonedge/shared/components/Skeleton.tsx';
import * as disclosureApi from '../services/disclosureApi.ts';
import { Mail, Phone, Clock, MapPin, ArrowLeft, ExternalLink, ChevronRight, Clock3 } from 'lucide-react';

export default function GrievanceRedressal() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    disclosureApi.getGrievanceContent().then((data) => {
      if (!cancelled) setContent(data);
    });
    return () => { cancelled = true; };
  }, []);

  if (!content) {
    return (
      <>
        <AppBar title="Grievance Redressal" />
        <div className="apk-screen">
          <Skeleton variant="card" height={180} />
          <Skeleton variant="card" height={240} />
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Grievance Redressal" />
      <div className="apk-screen apk-grievance-screen">
        <div className="apk-grievance-header">
          <h1>{content.title}</h1>
          <p>{content.summary}</p>
        </div>

        {/* Steps */}
        <div className="be-card apk-grievance-steps">
          <div className="be-eyebrow">Escalation Process</div>
          <div className="apk-grievance-step-list">
            {content.steps.map((step, idx) => (
              <div key={idx} className="apk-grievance-step">
                <div className="apk-grievance-step-num">{step.step}</div>
                <div className="apk-grievance-step-body">
                  <div className="apk-grievance-step-title">{step.title}</div>
                  <p className="apk-grievance-step-desc">{step.description}</p>
                  <div className="apk-grievance-step-timeline">
                    <Clock3 size={12} strokeWidth={2} />
                    <span>{step.timeline}</span>
                  </div>
                  {step.actionLabel && step.actionRoute && (
                    <button
                      className="apk-link apk-inline-link apk-mt-2"
                      onClick={() => navigate(step.actionRoute)}
                    >
                      {step.actionLabel} <ChevronRight size={12} strokeWidth={2} />
                    </button>
                  )}
                  {step.contactEmail && (
                    <a className="apk-link apk-inline-link apk-mt-2" href={`mailto:${step.contactEmail}`}>
                      {step.contactEmail} <ExternalLink size={12} strokeWidth={2} />
                    </a>
                  )}
                  {step.externalUrl && (
                    <a className="apk-link apk-inline-link apk-mt-2" href={step.externalUrl} target="_blank" rel="noopener noreferrer">
                      Visit portal <ExternalLink size={12} strokeWidth={2} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timelines */}
        <div className="be-card apk-grievance-timelines">
          <div className="be-eyebrow">Committed Timelines</div>
          <div className="apk-grievance-timeline-grid">
            {content.timelines.map((t, idx) => (
              <div key={idx} className="apk-grievance-timeline-item">
                <div className="apk-grievance-timeline-label">{t.label}</div>
                <div className="apk-grievance-timeline-value">{t.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="be-card apk-grievance-contact">
          <div className="be-eyebrow">Grievance Officer</div>
          <div className="apk-grievance-contact-grid">
            <div className="apk-grievance-contact-item">
              <Mail size={16} strokeWidth={1.5} />
              <span>{content.contact.email}</span>
            </div>
            <div className="apk-grievance-contact-item">
              <Phone size={16} strokeWidth={1.5} />
              <span>{content.contact.phone}</span>
            </div>
            <div className="apk-grievance-contact-item">
              <Clock size={16} strokeWidth={1.5} />
              <span>{content.contact.hours}</span>
            </div>
          </div>
          <div className="apk-grievance-contact-item apk-contact-address">
            <MapPin size={16} strokeWidth={1.5} />
            <span className="apk-pre-line">{content.contact.address}</span>
          </div>
        </div>

        <div className="apk-grievance-footer">
          <Link to="/app/explore" className="apk-back-link apk-inline-flex">
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Back to strategies</span>
          </Link>
        </div>
      </div>
    </>
  );
}
