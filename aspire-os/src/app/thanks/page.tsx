import Link from "next/link";

export default function Thanks() {
  return (
    <main className="flex-1 bg-midnight flex flex-col items-center justify-center px-6 py-32 text-center">
      <h1 className="font-sans font-semibold text-[40px] md:text-[64px] leading-[1.10] tracking-[-1.5px] text-silver-bright">
        A quiet thanks.
      </h1>

      <p className="mt-6 font-sans font-normal text-[17px] md:text-[19px] leading-[1.60] text-silver max-w-md">
        You&rsquo;re on the list. Aspire OS launches mid-June. One email when
        it&rsquo;s ready — nothing before then.
      </p>

      <Link
        href="/"
        className="mt-12 font-sans font-medium text-[12px] text-silver-muted uppercase tracking-[1.5px] hover:text-silver-bright transition-colors duration-150"
      >
        ← Back
      </Link>
    </main>
  );
}
