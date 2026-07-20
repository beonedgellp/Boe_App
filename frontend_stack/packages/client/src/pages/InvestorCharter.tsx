import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppBar from '../layout/AppBar.tsx';
import Skeleton from '@beonedge/shared/components/Skeleton.tsx';
import * as disclosureApi from '../services/disclosureApi.ts';
import { Mail, Phone, Clock, MapPin, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function InvestorCharter() {
  const [charter, setCharter] = useState(null);

  useEffect(() => {
    let cancelled = false;
    disclosureApi.getInvestorCharter().then((data) => {
      if (!cancelled) setCharter(data);
    });
    return () => { cancelled = true; };
  }, []);

  if (!charter) {
    return (
      <>
        <AppBar title="Investor Charter" />
        <div className="apk-screen">
          <Skeleton variant="card" height={180} />
          <Skeleton variant="card" height={240} />
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Investor Charter" />
      <div className="apk-screen apk-charter-screen">
        <div className="apk-charter-header">
          <ShieldCheck size={32} strokeWidth={1.5} />
          <h1>{charter.title}</h1>
          <p>Last updated: {charter.updatedAt}</p>
        </div>

        {charter.sections.map((section, idx) => (
          <div key={idx} className="be-card apk-charter-section">
            <div className="be-eyebrow">{section.heading}</div>
            <ul className="apk-charter-list">
              {section.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="be-card apk-charter-contact">
          <div className="be-eyebrow">Contact for Grievances</div>
          <div className="apk-charter-contact-grid">
            <div className="apk-charter-contact-item">
              <Mail size={16} strokeWidth={1.5} />
              <span>{charter.contact.email}</span>
            </div>
            <div className="apk-charter-contact-item">
              <Phone size={16} strokeWidth={1.5} />
              <span>{charter.contact.phone}</span>
            </div>
            <div className="apk-charter-contact-item">
              <Clock size={16} strokeWidth={1.5} />
              <span>{charter.contact.hours}</span>
            </div>
          </div>
          <div className="apk-charter-contact-item apk-contact-address">
            <MapPin size={16} strokeWidth={1.5} />
            <span className="apk-pre-line">{charter.contact.address}</span>
          </div>
        </div>

        <div className="apk-charter-footer">
          <Link to="/app/explore" className="apk-back-link apk-inline-flex">
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Back to strategies</span>
          </Link>
        </div>
      </div>
    </>
  );
}
