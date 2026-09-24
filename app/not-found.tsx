import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-20 text-center">
      <p className="font-display text-[clamp(4rem,16vw,180px)] leading-[0.8] text-red">
        404
      </p>
      <h1 className="mt-6 font-display text-[clamp(1.75rem,5vw,48px)] uppercase leading-[0.95] text-brown">
        Nothing on this shelf
      </h1>
      <p className="mt-5 max-w-[44ch] text-brown/70">
        That page doesn&apos;t exist — it may have been deleted, or the link may
        be wrong.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/recipes" className="btn btn-primary">
          The catalog
        </Link>
        <Link href="/landing" className="btn btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
