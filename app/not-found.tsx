import Link from "next/link";

export default function NotFound() {
  return (
    <div className="hero-wash flex min-h-screen flex-col items-center justify-center px-5 py-20 text-center">
      <p className="eyebrow">Error 404</p>
      <p className="mt-6 font-display text-[clamp(5rem,16vw,160px)] leading-[0.85] tracking-[-0.04em] text-zinc-900">
        404
      </p>
      <h1 className="mt-6 text-4xl tracking-tight sm:text-5xl">
        Nothing on this shelf
      </h1>
      <p className="mt-5 max-w-[44ch] text-lg text-zinc-400">
        That page doesn&apos;t exist — it may have been deleted, or the link may
        be wrong.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
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
