'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Toolbar } from './Toolbar';

interface TiptapEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
}

export function TiptapEditor({ content, onUpdate, placeholder }: TiptapEditorProps) {
  const lastExternalContent = useRef(content);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? '开始写作...',
      }),
      CharacterCount,
      Highlight,
      Typography,
      Link.configure({
        openOnClick: false,
      }),
      Image,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      lastExternalContent.current = html;
      onUpdate(html);
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
  });

  // 同步外部 content 变化到编辑器（如 AI 生成初稿）
  useEffect(() => {
    if (!editor) return;
    if (content === lastExternalContent.current) return;
    lastExternalContent.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--border)]">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex justify-end px-4 py-2 text-xs text-[var(--muted-foreground)] border-t border-[var(--border)]">
        {editor.storage.characterCount.characters()} 字
      </div>
    </div>
  );
}
