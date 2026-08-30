import { useState } from "react";
import { Icon } from "./Icon";

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (next: string) => void;
  type?: "text" | "number" | "textarea" | "email" | "tel";
  placeholder?: string;
  formatDisplay?: (value: string) => string;
  validate?: (value: string) => string | null; // returns an error message, or null if valid
}

/**
 * A field that renders as plain text with a small pencil icon; clicking
 * (or clicking the pencil) turns it into an input with Save / Cancel.
 * Never forces the user to delete and recreate a record just to fix a typo.
 */
export function EditableField({ label, value, onSave, type = "text", placeholder, formatDisplay, validate }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    if (validate) {
      const err = validate(draft);
      if (err) {
        setError(err);
        return;
      }
    }
    onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="py-1.5">
        <span className="block text-label-sm font-label-sm text-on-surface-variant mb-1">{label}</span>
        {type === "textarea" ? (
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-surface-container-lowest border border-border-hairline rounded px-3 py-2 text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        ) : (
          <input
            autoFocus
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="w-full bg-surface-container-lowest border border-border-hairline rounded px-3 py-2 text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        )}
        {error && <p className="text-xs text-error mt-1">{error}</p>}
        <div className="flex gap-2 mt-2">
          <button onClick={save} className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90">
            Save
          </button>
          <button onClick={cancel} className="text-xs font-bold px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const display = value ? (formatDisplay ? formatDisplay(value) : value) : "—";

  return (
    <div className="flex items-start justify-between gap-3 py-1.5 group">
      <div className="min-w-0">
        <span className="block text-label-sm font-label-sm text-on-surface-variant mb-0.5">{label}</span>
        <span className={`text-body-sm font-body-sm ${value ? "text-on-surface" : "text-outline"} break-words whitespace-pre-wrap`}>{display}</span>
      </div>
      <button
        onClick={startEdit}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-on-surface-variant hover:text-primary flex-shrink-0 mt-4 transition-opacity"
        aria-label={`Edit ${label}`}
        title={`Edit ${label}`}
      >
        <Icon name="edit" size={16} />
      </button>
    </div>
  );
}
