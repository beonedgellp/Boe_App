import { ListEditor, ObjectListEditor } from '../fields';

const DIGEST_FIELDS = [
  { key: 'tag', label: 'Tag', placeholder: 'Economy' },
  { key: 'title', label: 'Title' },
  { key: 'summary', label: 'Summary', type: 'textarea' },
];

let digestCounter = 0;

export default function NewsSection({ value, onChange }: any) {
  const news = value || {};
  const set = (field, fieldValue) => onChange({ ...news, [field]: fieldValue });

  return (
    <div className="ash-card">
      <ListEditor
        label="Taglines"
        items={news.taglines}
        onChange={(v) => set('taglines', v)}
        placeholder="Financial news, explained without jargon."
        max={6}
        addLabel="Add tagline"
        tooltip="Rotating headline texts on the news section. The first tagline becomes the section title; the next two become the lead paragraph."
      />
      <ObjectListEditor
        label="News digests"
        items={news.digests}
        onChange={(v) => set('digests', v)}
        itemFields={DIGEST_FIELDS}
        itemTitle={(item, index) => item.title || `Digest ${index + 1}`}
        newItem={() => ({ id: `digest-${Date.now()}-${digestCounter++}`, tag: '', title: '', summary: '' })}
        max={10}
        addLabel="Add digest"
        tooltip="News digest cards shown in a grid. Each has a category tag, title, and summary."
      />
    </div>
  );
}
