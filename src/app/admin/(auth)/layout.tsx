import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 sm:justify-center">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
