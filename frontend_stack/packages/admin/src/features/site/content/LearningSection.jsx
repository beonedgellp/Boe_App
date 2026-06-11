import { ObjectListEditor } from '../fields.jsx';

const STEP_FIELDS = [
  { key: 'step', label: 'Step number', type: 'number' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

export default function LearningSection({ value, onChange }) {
  const method = value || {};
  const steps = Array.isArray(method.steps) ? method.steps : [];

  return (
    <div className="ash-card">
      <ObjectListEditor
        label="Learning method steps"
        items={steps}
        onChange={(v) => onChange({ ...method, steps: v })}
        itemFields={STEP_FIELDS}
        itemTitle={(item, index) => item.title || `Step ${item.step || index + 1}`}
        newItem={() => ({ step: steps.length + 1, title: '', description: '' })}
        max={8}
        addLabel="Add step"
        tooltip="Numbered steps shown on the home page and /about page. Each step has a number, title, and short description."
      />
    </div>
  );
}
