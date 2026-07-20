import { TextAreaField, ObjectListEditor } from '../fields';

const STAT_FIELDS = [
  { key: 'value', label: 'Value', placeholder: '40,000+' },
  { key: 'label', label: 'Label', placeholder: 'Learners enrolled' },
];

const TESTIMONIAL_FIELDS = [
  { key: 'quote', label: 'Quote', type: 'textarea' },
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role', placeholder: 'First-time earner' },
];

let proofCounter = 0;

export default function SocialProofSection({ value, onChange }: any) {
  const proof = value || {};
  const set = (field, fieldValue) => onChange({ ...proof, [field]: fieldValue });

  return (
    <div className="ash-card">
      <ObjectListEditor
        label="Stats"
        items={proof.stats}
        onChange={(v) => set('stats', v)}
        itemFields={STAT_FIELDS}
        itemTitle={(item, index) => item.label || `Stat ${index + 1}`}
        newItem={() => ({ id: `stat-${Date.now()}-${proofCounter++}`, value: '', label: '' })}
        max={6}
        addLabel="Add stat"
        tooltip="Number blocks displayed in a row (e.g., '40,000+ Learners'). These build trust above testimonials."
      />
      <ObjectListEditor
        label="Testimonials"
        items={proof.testimonials}
        onChange={(v) => set('testimonials', v)}
        itemFields={TESTIMONIAL_FIELDS}
        itemTitle={(item, index) => item.name || `Testimonial ${index + 1}`}
        newItem={() => ({ id: `quote-${Date.now()}-${proofCounter++}`, quote: '', name: '', role: '' })}
        max={8}
        addLabel="Add testimonial"
        tooltip="Quote cards with learner names and roles. Displayed in a 3-column grid below stats."
      />
      <TextAreaField label="Instructor note" value={proof.instructorNote} onChange={(v) => set('instructorNote', v)} rows={2} help="One line on who builds and reviews the courses." tooltip="Text that appears under the social-proof heading and above the stats. Used for credibility messaging." />
    </div>
  );
}
