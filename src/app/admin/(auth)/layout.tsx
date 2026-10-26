import Link from "next/link";
import { getSiteSettings } from "@/lib/site";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { title } = await getSiteSettings();
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 sm:justify-center">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          {title}
        </Link>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
