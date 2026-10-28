import { Rss } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import { SiteNav, SiteNavLinks } from "@/components/site-nav";
import { getSiteSettings, RSS_PATH } from "@/lib/site";
import { isInternal, type NavLink } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const { title, navigation } = await getSiteSettings();

  return (
    <div className="site-shell mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
      {/* The links sit beside the title, or wrap below it on narrow screens. */}
      <header className="flex flex-wrap items-center justify-between gap-x-10 gap-y-2 border-b py-5 sm:py-6">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
          {title}
        </Link>
        {navigation.length > 0 && (
          <nav aria-label="Site" className="ml-auto">
            <Suspense fallback={<SiteNavLinks links={navigation} />}>
              <SiteNav links={navigation} />
            </Suspense>
          </nav>
        )}
      </header>
      <main className="flex-1 pt-12 pb-24 sm:pt-16">{children}</main>
      <SiteFooter title={title} links={navigation} />
    </div>
  );
}

const footerLink = "rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

function SiteFooter({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <footer className="flex flex-col gap-3 border-t pt-8 pb-12 text-sm text-muted-foreground">
      {links.length > 0 && (
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map(({ label, url }, i) => (
              <li key={i}>
                {isInternal(url) ? (
                  <Link href={url} className={footerLink}>
                    {label}
                  </Link>
                ) : (
                  <a href={url} className={footerLink}>
                    {label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Copyright title={title} />
        <a href={RSS_PATH} className={cn(footerLink, "inline-flex items-center gap-1.5")}>
          <Rss className="size-3.5" />
          RSS
        </a>
      </div>
    </footer>
  );
}

// Cached rather than rendered on every request: the year only has to be right to the day.
async function Copyright({ title }: { title: string }) {
  "use cache";
  cacheLife("days");
  return (
    <p>
      © {new Date().getFullYear()} {title}
    </p>
  );
}
