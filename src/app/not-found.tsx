import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary">404</p>
      <h1 className="mb-3 text-4xl font-bold md:text-5xl">Lost in space</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        That page drifted out of orbit. Head back to the portfolio and pick a destination.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Back to home
      </Link>
    </main>
  );
}
