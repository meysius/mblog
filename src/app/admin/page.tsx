import { PenLine, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/lib/format";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "Posts" };

export default function AdminPage() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <Link href="/admin/new" className={buttonVariants({ size: "lg" })}>
          <Plus data-icon="inline-start" />
          New post
        </Link>
      </div>
      <Suspense fallback={<PostTableSkeleton />}>
        <PostTable />
      </Suspense>
    </>
  );
}

async function PostTable() {
  // Render at request time so the admin always sees the current database state.
  await connection();
  const posts = await getAllPosts();

  if (posts.length === 0) {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PenLine />
          </EmptyMedia>
          <EmptyTitle>No posts yet</EmptyTitle>
          <EmptyDescription>
            Start with New post. Drafts stay private until you publish them.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Title</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="hidden w-36 pr-4 text-right sm:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="py-3 pl-4 whitespace-normal wrap-anywhere">
                <div className="font-medium">{post.title}</div>
                {post.publishedAt ? (
                  <Link
                    href={`/posts/${post.slug}`}
                    className="text-sm text-link underline-offset-4 hover:underline"
                  >
                    /posts/{post.slug}
                  </Link>
                ) : (
                  <div className="text-sm text-muted-foreground">/posts/{post.slug}</div>
                )}
              </TableCell>
              <TableCell>
                {post.publishedAt ? (
                  <Badge>Published</Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
              </TableCell>
              <TableCell className="hidden pr-4 text-right text-muted-foreground sm:table-cell">
                {post.publishedAt ? formatShortDate(post.publishedAt) : "Not published"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PostTableSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 rounded-xl border p-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center justify-between gap-6">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
