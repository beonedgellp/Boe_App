import { TextField, TextAreaField, LinkField } from '../fields';

export default function HeroSection({ value, onChange }: any) {
  const hero = value || {};
  const set = (field, fieldValue) => onChange({ ...hero, [field]: fieldValue });

  return (
    <div className="ash-card">
      <TextField label="Eyebrow" value={hero.eyebrow} onChange={(v) => set('eyebrow', v)} help="Small line above the headline." tooltip="Small label above the main headline. Appears at the very top of the hero block on the landing page home." />
      <TextField label="Headline" value={hero.title} onChange={(v) => set('title', v)} required help="Keep it to one sentence; two lines at most on desktop." tooltip="Main hero title. This is the first thing visitors read. Keep it short and clear." />
      <TextAreaField label="Lead" value={hero.lead} onChange={(v) => set('lead', v)} rows={3} help="Supporting copy under the headline. Aim for 20 words or fewer." tooltip="Supporting paragraph under the headline. Explains the value proposition in 1-2 sentences." />
      <LinkField label="Primary button" value={hero.primaryCta} onChange={(v) => set('primaryCta', v)} tooltip="Main call-to-action. Renders as a filled button in the hero actions row." />
      <LinkField label="Secondary button" value={hero.secondaryCta} onChange={(v) => set('secondaryCta', v)} tooltip="Secondary call-to-action. Renders as an outline button next to the primary." />
      <TextField label="Note" value={hero.note} onChange={(v) => set('note', v)} help="Small line under the buttons, for example the sign-up nudge." tooltip="Small text under the buttons. Often used for a sign-up nudge or trust signal." />
      <div className="ash-form-row">
        <TextField label="Image URL" value={hero.imageUrl} onChange={(v) => set('imageUrl', v)} help="Must start with https://" tooltip="Hero image source. Must be a secure HTTPS URL. Displays to the right of the text on desktop, above on mobile." />
        <TextField label="Image alt text" value={hero.imageAlt} onChange={(v) => set('imageAlt', v)} help="Describes the image for screen readers." tooltip="Accessibility description for the hero image. Read by screen readers." />
      </div>
    </div>
  );
}
