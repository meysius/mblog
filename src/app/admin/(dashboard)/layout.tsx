import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";
import { signOut } from "../auth-actions";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-8 px-6">
          <Link href="/admin" className="font-serif text-xl font-semibold tracking-tight">
            {SITE_NAME}
          </Link>
          <nav className="text-sm font-medium">
            <Link href="/admin">Posts</Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View site
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</div>
    </div>
  );
}
