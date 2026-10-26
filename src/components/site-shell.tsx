import Link from "next/link";
import { Suspense } from "react";
import { SiteNav, SiteNavLinks } from "@/components/site-nav";
import { getSiteSettings } from "@/lib/site";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const { title, navigation } = await getSiteSettings();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
      {/* The links sit beside the title, or wrap below it on narrow screens. */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 pt-12 pb-14 sm:pt-16 sm:pb-20">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          {title}
        </Link>
        {navigation.length > 0 && (
          <nav aria-label="Site">
            <Suspense fallback={<SiteNavLinks links={navigation} />}>
              <SiteNav links={navigation} />
            </Suspense>
          </nav>
        )}
      </header>
      <main className="flex-1 pb-24">{children}</main>
    </div>
  );
}
