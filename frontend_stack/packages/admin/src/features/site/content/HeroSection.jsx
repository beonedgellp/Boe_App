import { TextField, TextAreaField, LinkField } from '../fields.jsx';

export default function HeroSection({ value, onChange }) {
  const hero = value || {};
  const set = (field, fieldValue) => onChange({ ...hero, [field]: fieldValue });

  return (
    <div className="ash-card">
      <TextField label="Eyebrow" value={hero.eyebrow} onChange={(v) => set('eyebrow', v)} help="Small line above the headline." />
      <TextField label="Headline" value={hero.title} onChange={(v) => set('title', v)} required help="Keep it to one sentence; two lines at most on desktop." />
      <TextAreaField label="Lead" value={hero.lead} onChange={(v) => set('lead', v)} rows={3} help="Supporting copy under the headline. Aim for 20 words or fewer." />
      <LinkField label="Primary button" value={hero.primaryCta} onChange={(v) => set('primaryCta', v)} />
      <LinkField label="Secondary button" value={hero.secondaryCta} onChange={(v) => set('secondaryCta', v)} />
      <TextField label="Note" value={hero.note} onChange={(v) => set('note', v)} help="Small line under the buttons, for example the sign-up nudge." />
      <div className="ash-form-row">
        <TextField label="Image URL" value={hero.imageUrl} onChange={(v) => set('imageUrl', v)} help="Must start with https://" />
        <TextField label="Image alt text" value={hero.imageAlt} onChange={(v) => set('imageAlt', v)} help="Describes the image for screen readers." />
      </div>
    </div>
  );
}
