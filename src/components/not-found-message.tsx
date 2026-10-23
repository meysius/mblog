import Link from "next/link";

export function NotFoundMessage() {
  return (
    <>
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 font-serif text-lg text-muted-foreground">
        This page doesn’t exist, or it hasn’t been published yet.
      </p>
      <Link href="/" className="mt-8 inline-block text-link underline underline-offset-4">
        Go to the homepage
      </Link>
    </>
  );
}
