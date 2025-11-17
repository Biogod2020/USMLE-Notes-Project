import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Topic } from '../types';
import { useTopicDraft } from '../hooks/useTopicDraft';

interface Props {
  topic: Topic | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (topic: Topic) => void;
  onPersist?: (topic: Topic) => Promise<void>;
  onResetOverride?: () => Promise<void>;
  canPersist?: boolean;
  hasOverride?: boolean;
  sourceFile?: string | null;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="topic-editor-field">
      <span className="topic-editor-field-label">{label}</span>
      {children}
    </label>
  );
}

function TokenInput({
  items,
  onAdd,
  onRemove,
  placeholder,
  prefix = '',
}: {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  prefix?: string;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="token-input">
      <div className="token-list">
        {items.map(item => (
          <button type="button" key={item} className="token-chip" onClick={() => onRemove(item)}>
            {prefix}{item}<span aria-hidden> ×</span>
          </button>
        ))}
      </div>
      <div className="token-input-row">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && value.trim()) {
              e.preventDefault();
              onAdd(value.trim());
              setValue('');
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (value.trim()) {
              onAdd(value.trim());
              setValue('');
            }
          }}
          className="ghost"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function TopicEditor({ topic, isOpen, onClose, onSave, onPersist, onResetOverride, canPersist = false, hasOverride = false, sourceFile }: Props) {
  const { draft, dirty, updateField, updateContentField, pushTag, removeTag, pushClassificationSegment, removeClassificationSegment, resetDraft, addConnection, updateConnection, removeConnection, addContentSection, removeContentSection } = useTopicDraft(topic);
  const supplementalSections = useMemo(() => {
    if (!draft) return [] as Array<{ key: string }>;
    return Object.entries(draft.content || {})
      .filter(([key]) => !['definition', 'atAGlance', 'takeAway'].includes(key))
      .map(([key]) => ({ key }));
  }, [draft]);
  const [sectionKey, setSectionKey] = useState('');
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);

  const validationMessages = useMemo(() => {
    if (!draft) return [];
    const issues: string[] = [];
    if (!draft.title?.trim()) issues.push('Title is required.');
    if (!draft.id?.trim()) issues.push('Topic ID is required.');
    if (!draft.primaryType?.trim()) issues.push('Primary type is required.');
    (draft.connections ?? []).forEach((conn, idx) => {
      if (!conn?.type?.trim() || !conn?.to?.trim()) {
        issues.push(`Connection #${idx + 1} requires both type and target.`);
      }
    });
    return issues;
  }, [draft]);

  const handleAddSection = () => {
    if (!draft) return;
    const key = sectionKey.trim();
    if (!key) {
      setSectionError('Section key is required.');
      return;
    }
    if (['definition', 'atAGlance', 'takeAway'].includes(key)) {
      setSectionError('Key already exists in core fields.');
      return;
    }
    if (draft.content && key in draft.content) {
      setSectionError('Key already exists.');
      return;
    }
    addContentSection(key);
    setSectionKey('');
    setSectionError(null);
  };

  const handleSave = () => {
    if (draft) {
      onSave(draft);
      setPersistError(null);
    }
  };

  const handlePersist = async () => {
    if (!draft || !onPersist || !canPersist) return;
    setPersistError(null);
    setIsPersisting(true);
    try {
      await onPersist(draft);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save to disk.';
      setPersistError(message);
    } finally {
      setIsPersisting(false);
    }
  };

  useEffect(() => {
    setPersistError(null);
    setIsPersisting(false);
  }, [topic, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="topic-editor-overlay" role="presentation" onClick={onClose}>
      <aside
        className="topic-editor-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Topic editor"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="topic-editor-header">
          <div>
            <p className="topic-editor-kicker">Editing{hasOverride ? ' (Override active)' : ''}</p>
            <h3>{topic?.title ?? 'No topic selected'}</h3>
            <p className="topic-editor-subtitle">
              {topic ? (
                dirty ? 'You have unsaved changes.' : 
                hasOverride ? 'This topic has local overrides. Changes are saved to a separate file.' :
                'Changes will be saved to a local override file, leaving the original untouched.'
              ) : 'Select a topic to enable the editor.'}
            </p>
            {sourceFile && <p className="topic-editor-source">Source: {sourceFile}</p>}
            {!canPersist && topic ? (
              <p className="topic-editor-source warning">Open the desktop app to enable saving edits to disk.</p>
            ) : null}
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close editor">
            &times;
          </button>
          {validationMessages.length > 0 && (
            <ul className="topic-editor-warning-list">
              {validationMessages.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </header>

        <div className="topic-editor-body">
          {topic && draft ? (
            <>
              <fieldset>
                <Field label="Title">
                  <input type="text" value={draft.title} onChange={(e) => updateField('title', e.target.value)} />
                </Field>
                <div className="topic-editor-grid">
                  <Field label="Primary type">
                    <input type="text" value={draft.primaryType} onChange={(e) => updateField('primaryType', e.target.value)} />
                  </Field>
                  <Field label="Topic ID">
                    <input type="text" value={draft.id} onChange={(e) => updateField('id', e.target.value)} />
                  </Field>
                </div>

                <Field label="Classification path">
                  <TokenInput
                    items={draft.classificationPath ?? []}
                    onAdd={segment => pushClassificationSegment(segment)}
                    onRemove={segment => removeClassificationSegment(segment)}
                    placeholder="Add classification segment"
                  />
                </Field>

                <Field label="Tags">
                  <TokenInput
                    items={draft.tags ?? []}
                    onAdd={tag => pushTag(tag)}
                    onRemove={tag => removeTag(tag)}
                    placeholder="Add a tag"
                    prefix="#"
                  />
                </Field>

                <Field label="Definition">
                  <textarea rows={4} value={String(draft.content?.definition ?? '')} onChange={(e) => updateContentField('definition', e.target.value)} />
                </Field>

                <Field label="At a glance">
                  <textarea rows={4} value={String(draft.content?.atAGlance ?? '')} onChange={(e) => updateContentField('atAGlance', e.target.value)} />
                </Field>

                <Field label="Key take away">
                  <textarea rows={3} value={String(draft.content?.takeAway ?? '')} onChange={(e) => updateContentField('takeAway', e.target.value)} />
                </Field>

                {supplementalSections.map(({ key }) => (
                  <Field key={key} label={key}>
                    <div className="field-with-action">
                      <textarea rows={3} value={String(draft.content?.[key] ?? '')} onChange={(e) => updateContentField(key, e.target.value)} />
                      <button type="button" className="ghost" onClick={() => removeContentSection(key)}>
                        Remove
                      </button>
                    </div>
                  </Field>
                ))}

                <Field label="Add custom section">
                  <div className="token-input">
                    <div className="token-input-row">
                      <input type="text" value={sectionKey} placeholder="e.g. clinicalPearls" onChange={(e) => setSectionKey(e.target.value)} />
                      <button type="button" className="ghost" onClick={handleAddSection}>
                        Add section
                      </button>
                    </div>
                    {sectionError ? <p className="field-hint error">{sectionError}</p> : <p className="field-hint">Use camelCase or snake_case keys.</p> }
                  </div>
                </Field>

                <Field label="Connections">
                  {(draft.connections ?? []).length ? (
                    <ul className="topic-editor-connections">
                      {(draft.connections ?? []).map((conn, idx) => (
                        <li key={`${conn?.to ?? 'target'}-${idx}`} className="connection-row">
                          <input
                            type="text"
                            value={conn?.type ?? ''}
                            placeholder="relationship type"
                            onChange={e => updateConnection(idx, { type: e.target.value })}
                          />
                          <input
                            type="text"
                            value={conn?.to ?? ''}
                            placeholder="target topic id"
                            onChange={e => updateConnection(idx, { to: e.target.value })}
                          />
                          <button type="button" className="ghost" onClick={() => removeConnection(idx)} aria-label={`Remove connection ${idx + 1}`}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <input type="text" value="" placeholder="No connections" readOnly />
                  )}
                  <button type="button" className="ghost" onClick={addConnection}>
                    Add connection
                  </button>
                </Field>
              </fieldset>
            </>
          ) : (
            <div className="topic-editor-empty">
              <p>Select a topic to inspect its structure before editing becomes available.</p>
            </div>
          )}
        </div>

        <footer className="topic-editor-footer">
          <div className="topic-editor-footer-left">
            {dirty ? <span className="unsaved-indicator">Unsaved draft</span> : null}
            {hasOverride && onResetOverride && (
              <button type="button" className="ghost" onClick={onResetOverride} disabled={isPersisting}>
                🔄 Reset to original
              </button>
            )}
          </div>
          <div className="topic-editor-footer-right">
            <button type="button" className="ghost" onClick={resetDraft} disabled={!dirty}>
              Reset
            </button>
            <button type="button" className="ghost" onClick={handleSave} disabled={!dirty || !draft}>
              Save draft
            </button>
            <button
              type="button"
              className="primary"
              onClick={handlePersist}
              disabled={!dirty || !draft || !onPersist || !canPersist || isPersisting}
            >
              {isPersisting ? 'Saving…' : 'Save to disk'}
            </button>
          </div>
          {persistError ? <p className="topic-editor-error">{persistError}</p> : null}
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default TopicEditor;
