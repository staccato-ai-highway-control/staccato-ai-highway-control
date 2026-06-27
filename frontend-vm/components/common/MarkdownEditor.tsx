"use client";

import { useRef, useState } from "react";
import { Bold, CheckSquare, Code2, Eye, Heading2, List, Table2 } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

type Props = {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  disabled?: boolean;
};

const tools = [
  { label: "제목", icon: Heading2, before: "## ", after: "제목" },
  { label: "굵게", icon: Bold, before: "**", after: "굵은 글씨", close: "**" },
  { label: "목록", icon: List, before: "- ", after: "항목" },
  { label: "체크리스트", icon: CheckSquare, before: "- [ ] ", after: "할 일" },
  { label: "표", icon: Table2, before: "| 항목 | 내용 |\n| --- | --- |\n| 예시 | 설명 |", after: "" },
  { label: "코드", icon: Code2, before: "```\n", after: "코드", close: "\n```" },
];

export function MarkdownEditor({ value, onChange, minRows = 12, disabled = false }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  function insert(before: string, fallback: string, close = "") {
    const element = textareaRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const needsNewLine = start > 0 && value[start - 1] !== "\n" && (before.startsWith("-") || before.startsWith("|") || before.startsWith("#") || before.startsWith("```"));
    const prefix = needsNewLine ? `\n${before}` : before;
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${close}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      const cursor = start + prefix.length + selected.length + close.length;
      element?.focus();
      element?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {tools.map(({ label, icon: Icon, before, after, close }) => <button key={label} type="button" disabled={disabled} onClick={() => insert(before, after, close)} title={label} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Icon className="h-4 w-4" />{label}</button>)}
        <button type="button" onClick={() => setShowPreview((current) => !current)} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-blue-700 hover:bg-blue-50"><Eye className="h-4 w-4" />{showPreview ? "편집" : "미리보기"}</button>
      </div>
      {showPreview ? <MarkdownContent content={value} className="min-h-72 p-5" /> : <textarea ref={textareaRef} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} rows={minRows} placeholder="# 제목\n\n내용을 Markdown으로 작성하세요.\n\n- [ ] 확인할 항목" className="block w-full resize-y border-0 p-4 font-mono text-sm leading-6 text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-500" />}
      <p className="border-t border-slate-100 px-3 py-2 text-xs font-semibold text-slate-400">Markdown 지원 · 제목, 표, 목록, 체크리스트, 코드 블록을 사용할 수 있습니다.</p>
    </div>
  );
}
