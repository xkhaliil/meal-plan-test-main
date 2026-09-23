/**
 * Scrolling ticker band. The original band is 1440x97 with the inner track
 * running ~3014px wide; the track holds the items twice so the -50% translate
 * loops seamlessly.
 */
export default function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  const sequence = [...items, ...items];

  return (
    <div
      className={`flex h-[97px] items-center overflow-hidden border-b-2 border-brown bg-yellow ${className}`}
      aria-hidden
    >
      <div className="marquee-track">
        {sequence.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex shrink-0 items-center whitespace-nowrap text-3xl uppercase leading-none tracking-tight text-brown sm:text-[44px]"
          >
            {item}
            <span className="mx-8 text-red">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
