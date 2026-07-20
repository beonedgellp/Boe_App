import { LinkField, ObjectListEditor } from '../fields';

const LINK_FIELDS = [
  { key: 'label', label: 'Label' },
  { key: 'href', label: 'Destination', placeholder: '/courses' },
];

export default function NavSection({ value, onChange }: any) {
  const nav = value || {};
  const set = (field, fieldValue) => onChange({ ...nav, [field]: fieldValue });

  return (
    <div className="ash-card">
      <ObjectListEditor
        label="Navigation links"
        items={nav.links}
        onChange={(v) => set('links', v)}
        itemFields={LINK_FIELDS}
        itemTitle={(item, index) => item.label || `Link ${index + 1}`}
        newItem={() => ({ label: '', href: '/' })}
        max={8}
        addLabel="Add link"
        tooltip="Top nav bar links. Appears in the header on every landing page."
      />
      <LinkField label="Sign in link" value={nav.signIn} onChange={(v) => set('signIn', v)} tooltip="Sign-in button in the nav bar." />
      <LinkField label="Sign up link" value={nav.signUp} onChange={(v) => set('signUp', v)} tooltip="Sign-up button in the nav bar." />
    </div>
  );
}
