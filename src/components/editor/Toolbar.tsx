'use client';

import type { Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor;
}

export function Toolbar({ editor }: ToolbarProps) {
  const buttons = [
    {
      id: 'h1',
      label: 'H1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      id: 'h2',
      label: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      id: 'h3',
      label: 'H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    { id: 'sep1', label: '|', action: () => {}, isActive: false },
    {
      id: 'bold',
      label: 'B',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      id: 'italic',
      label: 'I',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      id: 'highlight',
      label: 'H',
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive('highlight'),
    },
    { id: 'sep2', label: '|', action: () => {}, isActive: false },
    {
      id: 'quote',
      label: '引用',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      id: 'code',
      label: '代码',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
    },
    { id: 'sep3', label: '|', action: () => {}, isActive: false },
    {
      id: 'ul',
      label: '无序列表',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      id: 'ol',
      label: '有序列表',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--border)] px-3 py-2">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={btn.action}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            btn.isActive
              ? 'bg-[var(--primary)] text-white'
              : 'hover:bg-[var(--muted)]'
          }`}
          title={btn.label}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
