import { Fragment, type ReactNode } from "react";

function safeHref(value: string) {
  const href = value.trim();
  return /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : "#";
}

function renderInline(text: string): ReactNode[] {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|~~([^~]+)~~|`([^`]+)`)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[2] !== undefined) {
      const href = safeHref(match[3]);
      nodes.push(
        <a key={`${match.index}-link`} href={href} target={href === "#" ? undefined : "_blank"} rel="noreferrer" className="font-semibold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-800">
          {match[2]}
        </a>
      );
    } else if (match[4] !== undefined) {
      nodes.push(<strong key={`${match.index}-strong`} className="font-black text-slate-950">{match[4]}</strong>);
    } else if (match[5] !== undefined) {
      nodes.push(<del key={`${match.index}-del`} className="text-slate-500">{match[5]}</del>);
    } else if (match[6] !== undefined) {
      nodes.push(<code key={`${match.index}-code`} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] font-bold text-pink-700">{match[6]}</code>);
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function tableCells(line: string) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  return (
    !line.trim() ||
    /^#{1,3}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^```/.test(line) ||
    /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    (line.includes("|") && isTableDivider(lines[index + 1] ?? ""))
  );
}

export function MarkdownContent({ content, className = "" }: { content?: string | null; className?: string }) {
  const lines = String(content ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const fence = line.match(/^```\s*([\w-]*)/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`} className="my-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const classes = level === 1 ? "mt-2 border-b border-slate-200 pb-3 text-2xl" : level === 2 ? "mt-7 border-b border-slate-200 pb-2 text-xl" : "mt-6 text-lg";
      const children = renderInline(heading[2]);
      blocks.push(level === 1 ? <h1 key={`h-${index}`} className={`${classes} font-black text-slate-950`}>{children}</h1> : level === 2 ? <h2 key={`h-${index}`} className={`${classes} font-black text-slate-950`}>{children}</h2> : <h3 key={`h-${index}`} className={`${classes} font-black text-slate-950`}>{children}</h3>);
      index += 1;
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={`hr-${index}`} className="my-6 border-slate-200" />);
      index += 1;
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] ?? "")) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) rows.push(tableCells(lines[index++]));
      blocks.push(
        <div key={`table-${index}`} className="my-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50"><tr>{headers.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-r border-slate-200 px-4 py-2.5 font-black text-slate-800 last:border-r-0">{renderInline(cell)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="even:bg-slate-50/60">{headers.map((_, cellIndex) => <td key={cellIndex} className="border-b border-r border-slate-200 px-4 py-2.5 align-top text-slate-700 last:border-r-0 last-of-type:border-r-0">{renderInline(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={`quote-${index}`} className="my-4 border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-600">{quote.map((item, itemIndex) => <Fragment key={itemIndex}>{renderInline(item)}{itemIndex < quote.length - 1 ? <br /> : null}</Fragment>)}</blockquote>);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: Array<{ text: string; checked?: boolean }> = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        const item = lines[index++].replace(/^\s*[-*+]\s+/, "");
        const task = item.match(/^\[([ xX])\]\s*(.*)$/);
        items.push(task ? { text: task[2], checked: task[1].toLowerCase() === "x" } : { text: item });
      }
      blocks.push(<ul key={`ul-${index}`} className="my-3 grid list-disc gap-1.5 pl-6 text-slate-700">{items.map((item, itemIndex) => <li key={itemIndex} className={item.checked !== undefined ? "flex list-none items-start gap-2 -ml-6" : "pl-1"}>{item.checked !== undefined ? <input type="checkbox" checked={item.checked} readOnly className="mt-1 h-4 w-4 rounded border-slate-300 accent-blue-600" aria-label={item.text} /> : null}<span className={item.checked ? "text-slate-500 line-through" : ""}>{renderInline(item.text)}</span></li>)}</ul>);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={`ol-${index}`} className="my-3 grid list-decimal gap-1.5 pl-6 text-slate-700">{items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{renderInline(item)}</li>)}</ol>);
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) paragraph.push(lines[index++]);
    blocks.push(<p key={`p-${index}`} className="my-3 break-words text-[15px] font-medium leading-7 text-slate-700">{paragraph.map((item, itemIndex) => <Fragment key={itemIndex}>{renderInline(item)}{itemIndex < paragraph.length - 1 ? <br /> : null}</Fragment>)}</p>);
  }

  return <div className={`markdown-content min-w-0 ${className}`}>{blocks.length ? blocks : <p className="text-sm text-slate-400">내용이 없습니다.</p>}</div>;
}
