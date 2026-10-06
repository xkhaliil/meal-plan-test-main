import { Fragment, type ReactNode } from "react";

/**
 * The small slice of Markdown a chat model actually emits: bold runs, bullet
 * and numbered lists, headings, paragraphs. Rendered to React elements rather
 * than HTML, so nothing the model writes can inject markup.
 */
const BOLD = /(\*\*[^*]+\*\*)/g;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
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
  /** The number the model gave the list's first item. */
  let start = 1;

  function flushList() {
    if (items.length === 0) return;

    const rendered = items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(
      ordered ? (
        <ol
          key={blocks.length}
          start={start}
          className="ml-5 list-decimal space-y-1.5 marker:text-zinc-400"
        >
          {rendered}
        </ol>
      ) : (
        <ul
          key={blocks.length}
          className="ml-5 list-disc space-y-1.5 marker:text-zinc-300"
        >
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
      if (items.length === 0) start = numbered ? Number(numbered[1]) : 1;
      ordered = nextOrdered;
      items.push(bullet ? bullet[1] : numbered![2]);
      continue;
    }

    // Models put blank lines between list items. Ending the list there made
    // every item its own one-item <ol>, so each one was numbered "1.". Only a
    // line of real text ends a list.
    if (!line.trim()) continue;

    flushList();

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push(
        <p
          key={blocks.length}
          className="pt-1 text-[15px] font-semibold leading-tight text-zinc-900"
        >
          {inline(heading[1])}
        </p>
      );
    } else {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flushList();

  return <div className="space-y-2.5 leading-relaxed">{blocks}</div>;
}
