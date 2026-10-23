import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
      <header className="pt-12 pb-14 sm:pt-16 sm:pb-20">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
      </header>
      <main className="flex-1 pb-24">{children}</main>
    </div>
  );
}
