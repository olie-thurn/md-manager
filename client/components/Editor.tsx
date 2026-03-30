"use client";

import { useCallback, useRef } from "react";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  filePath: string;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  onSave: () => Promise<void>;
}

type ToolbarAction =
  | { type: "wrap"; before: string; after: string; placeholder: string }
  | { type: "insert"; text: string };

const TOOLBAR_BUTTONS: Array<{
  label: string;
  title: string;
  action: ToolbarAction;
}> = [
  {
    label: "B",
    title: "Bold",
    action: { type: "wrap", before: "**", after: "**", placeholder: "bold" },
  },
  {
    label: "I",
    title: "Italic",
    action: { type: "wrap", before: "*", after: "*", placeholder: "italic" },
  },
  {
    label: "H",
    title: "Heading",
    action: { type: "insert", text: "# " },
  },
  {
    label: "[ ]",
    title: "Link",
    action: {
      type: "wrap",
      before: "[",
      after: "](url)",
      placeholder: "text",
    },
  },
  {
    label: "</>",
    title: "Code block",
    action: {
      type: "insert",
      text: "```\n\n```",
    },
  },
];

/**
 * Markdown editor with a basic formatting toolbar.
 *
 * Toolbar buttons insert Markdown syntax at the cursor or wrap the selection.
 * The Tab key inserts 2 spaces instead of moving focus.
 */
export function Editor({
  content,
  onChange,
  filePath,
  isDirty,
  isSaving,
  saveError,
  onSave,
}: EditorProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Apply a toolbar action to the textarea at the current cursor/selection. */
  const applyAction = useCallback(
    (action: ToolbarAction): void => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end);

      let newContent: string;
      let newCursorStart: number;
      let newCursorEnd: number;

      if (action.type === "wrap") {
        const inner = selected.length > 0 ? selected : action.placeholder;
        const before = content.slice(0, start);
        const after = content.slice(end);
        newContent = `${before}${action.before}${inner}${action.after}${after}`;
        newCursorStart = start + action.before.length;
        newCursorEnd = newCursorStart + inner.length;
      } else {
        // Insert at cursor (replace selection if any)
        const before = content.slice(0, start);
        const after = content.slice(end);
        newContent = `${before}${action.text}${after}`;
        newCursorStart = start + action.text.length;
        newCursorEnd = newCursorStart;
      }

      onChange(newContent);

      // Restore focus and selection after React re-renders
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
      });
    },
    [content, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      // Tab → insert 2 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = content.slice(0, start);
        const after = content.slice(end);
        const newContent = `${before}  ${after}`;
        onChange(newContent);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        });
        return;
      }

      // Ctrl+S / Cmd+S → save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void onSave();
      }
    },
    [content, onChange, onSave],
  );

  const fileName = filePath.split("/").pop() ?? filePath;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            aria-label={btn.title}
            className="rounded px-2 py-1 font-mono text-xs text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
            onClick={() => applyAction(btn.action)}
          >
            {btn.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* File name + dirty indicator */}
        <span className="text-xs text-neutral-400">
          {fileName}
          {isDirty && (
            <span
              className="ml-1 text-amber-500"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            >
              ●
            </span>
          )}
        </span>

        {/* Save button */}
        <button
          type="button"
          disabled={!isDirty || isSaving}
          onClick={() => void onSave()}
          className="ml-2 rounded bg-neutral-800 px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Save error banner */}
      {saveError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {saveError}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="w-full flex-1 resize-none bg-white p-4 font-mono text-sm text-neutral-800 outline-none placeholder:text-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-600"
        placeholder="Start writing…"
        aria-label={`Editor for ${fileName}`}
      />
    </div>
  );
}
