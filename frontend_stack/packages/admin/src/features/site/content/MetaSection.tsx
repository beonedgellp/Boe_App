import { TextField, TextAreaField } from '../fields';

export default function MetaSection({ value, onChange }: any) {
  const meta = value || {};
  const set = (field, fieldValue) => onChange({ ...meta, [field]: fieldValue });

  return (
    <div className="ash-card">
      <TextField label="Site name" value={meta.siteName} onChange={(v) => set('siteName', v)} required help="Always written in full; never abbreviated." tooltip="Brand name. Used in the page title, nav brand, and footer." />
      <TextField label="Descriptor" value={meta.descriptor} onChange={(v) => set('descriptor', v)} help="Short line used in the nav and footer." tooltip="Short tagline. Used in the HTML <title> and footer copyright line." />
      <TextAreaField label="Long descriptor" value={meta.longDescriptor} onChange={(v) => set('longDescriptor', v)} rows={3} tooltip="Longer description. Used in SEO meta tags and the footer description block." />
      <TextField label="Contact email" value={meta.contactEmail} onChange={(v) => set('contactEmail', v)} tooltip="Email address shown in the footer and used for contact links." />
      <TextAreaField label="Disclaimer" value={meta.disclaimer} onChange={(v) => set('disclaimer', v)} rows={3} help="Mandatory educational disclaimer shown in the footer." tooltip="Legal disclaimer shown in the footer and under the news section." />
    </div>
  );
}
