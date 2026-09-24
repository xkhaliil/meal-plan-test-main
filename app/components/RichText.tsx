import { Fragment, type ReactNode } from "react";

/**
 * The small slice of Markdown a chat model actually emits: bold runs, bullet
 * and numbered lists, headings, paragraphs. Rendered to React elements rather
 * than HTML, so nothing the model writes can inject markup.
 */
const BOLD = /(\*\*[^*]+\*\*)/g;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,4}\s+(.*)$/;

function inline(text: string): ReactNode[] {
  return text.split(BOLD).map((part, i) =>
    part.length > 4 && part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export default function RichText({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  let ordered = false;

  function flushList() {
    if (items.length === 0) return;

    const rendered = items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(
      ordered ? (
        <ol key={blocks.length} className="ml-5 list-decimal space-y-1">
          {rendered}
        </ol>
      ) : (
        <ul key={blocks.length} className="ml-5 list-disc space-y-1">
          {rendered}
        </ul>
      )
    );
    items = [];
  }

  for (const line of content.split("\n")) {
    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBERED);

    if (bullet || numbered) {
      const nextOrdered = numbered !== null;
      // A list that switches kind mid-run is two lists.
      if (items.length > 0 && nextOrdered !== ordered) flushList();
      ordered = nextOrdered;
      items.push((bullet ?? numbered)![1]);
      continue;
    }

    flushList();

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push(
        <p
          key={blocks.length}
          className="font-display text-base uppercase leading-tight"
        >
          {inline(heading[1])}
        </p>
      );
    } else if (line.trim()) {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flushList();

  return <div className="space-y-2.5 leading-relaxed">{blocks}</div>;
}
