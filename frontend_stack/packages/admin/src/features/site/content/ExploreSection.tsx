import { TextField, TextAreaField, ObjectListEditor } from '../fields.tsx';

const TILE_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'href', label: 'Destination', placeholder: '/courses' },
  {
    key: 'size',
    label: 'Tile size',
    type: 'select',
    options: [
      { value: 'standard', label: 'Standard tile' },
      { value: 'large', label: 'Large tile' },
      { value: 'wide', label: 'Wide tile' },
    ],
  },
];

let tileCounter = 0;

export default function ExploreSection({ value, onChange }) {
  const explore = value || {};
  const set = (field, fieldValue) => onChange({ ...explore, [field]: fieldValue });

  return (
    <div className="ash-card">
      <TextField label="Section title" value={explore.title} onChange={(v) => set('title', v)} tooltip="Heading above the bento tile grid on the home page." />
      <TextAreaField label="Section lead" value={explore.lead} onChange={(v) => set('lead', v)} rows={2} tooltip="Short description under the explore heading." />
      <ObjectListEditor
        label="Tiles"
        items={explore.tiles}
        onChange={(v) => set('tiles', v)}
        itemFields={TILE_FIELDS}
        itemTitle={(item, index) => item.title || `Tile ${index + 1}`}
        newItem={() => ({ id: `tile-${Date.now()}-${tileCounter++}`, title: '', description: '', href: '/', size: 'standard' })}
        max={8}
        addLabel="Add tile"
        tooltip="Bento grid tiles on the home page. Each tile links to a page (Courses, Premium, News, Plans, About). Large and wide tiles span multiple grid cells."
      />
    </div>
  );
}
