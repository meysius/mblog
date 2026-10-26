import { Plus, StickyNote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getPages } from "@/lib/pages";
import { PostRow, PostRowsSkeleton } from "../post-rows";

export const metadata: Metadata = { title: "Pages" };

export default function PagesPage() {
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold tracking-tight">Pages</h1>
        <Link href="/admin/pages/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          New page
        </Link>
      </div>

      <Suspense fallback={<PostRowsSkeleton />}>
        <PageList />
      </Suspense>
    </>
  );
}

async function PageList() {
  // Render at request time so the admin always sees the current database state.
  await connection();
  const pages = await getPages();

  if (pages.length === 0) {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <StickyNote />
          </EmptyMedia>
          <EmptyTitle>No pages yet</EmptyTitle>
          <EmptyDescription>
            Pages stand on their own, like an About page, and aren’t listed with your posts.
            Link to them from the header in Settings.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="-mx-3">
      {pages.map((page) => (
        <PostRow key={page.id} kind="page" post={page} />
      ))}
    </ul>
  );
}
