import Link from "next/link";
import { formatMonthDay } from "@/lib/format";
import { getPublishedPosts } from "@/lib/posts";

type Post = Awaited<ReturnType<typeof getPublishedPosts>>[number];

function groupByYear(posts: Post[]) {
  const years = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.publishedAt.getFullYear();
    years.set(year, [...(years.get(year) ?? []), post]);
  }
  return [...years];
}

export default async function Home() {
  const posts = await getPublishedPosts();

  if (posts.length === 0) {
    return <p className="font-serif text-xl text-muted-foreground">Nothing published yet.</p>;
  }

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      {groupByYear(posts).map(([year, yearPosts]) => (
        <section
          key={year}
          aria-labelledby={`year-${year}`}
          className="grid gap-6 md:grid-cols-[8rem_1fr] md:gap-10"
        >
          {/* The year stays pinned in the margin while its posts scroll past. */}
          <h2
            id={`year-${year}`}
            className="font-serif text-5xl leading-none font-light text-muted-foreground tabular-nums md:sticky md:top-10 md:self-start md:text-6xl"
          >
            {year}
          </h2>
          <ul className="flex flex-col gap-10">
            {yearPosts.map((post) => (
              <li key={post.slug}>
                <article>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                    <h3 className="font-serif text-2xl leading-snug font-medium text-balance">
                      <Link
                        href={`/posts/${post.slug}`}
                        className="decoration-link decoration-2 underline-offset-4 transition-colors hover:text-link hover:underline"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <time
                      dateTime={post.publishedAt.toISOString()}
                      className="shrink-0 text-sm text-muted-foreground tabular-nums"
                    >
                      {formatMonthDay(post.publishedAt)}
                    </time>
                  </div>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 font-serif text-lg leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
