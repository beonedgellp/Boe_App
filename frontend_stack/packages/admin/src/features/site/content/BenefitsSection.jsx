import { ObjectListEditor } from '../fields.jsx';

const BENEFIT_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

let benefitCounter = 0;

export default function BenefitsSection({ value, onChange }) {
  const premium = value || {};

  return (
    <div className="ash-card">
      <ObjectListEditor
        label="Premium benefits"
        items={premium.benefits}
        onChange={(v) => onChange({ ...premium, benefits: v })}
        itemFields={BENEFIT_FIELDS}
        itemTitle={(item, index) => item.title || `Benefit ${index + 1}`}
        newItem={() => ({ id: `benefit-${Date.now()}-${benefitCounter++}`, title: '', description: '' })}
        max={12}
        addLabel="Add benefit"
      />
    </div>
  );
}
