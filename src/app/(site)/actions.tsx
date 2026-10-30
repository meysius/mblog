"use server";

import { PostCard, PostListItem } from "@/components/post-list";
import { parsePageParam } from "@/lib/pagination";
import { getHomePage, getPublishedPostsTagged } from "@/lib/posts";

// The next page of a list, rendered for InfinitePosts to add to it. At its own URL a
// number that isn't a later page gets a 404; here it gets no posts.

export async function loadHomePage(page: number) {
  if (!parsePageParam(String(page))) return [];
  const { posts } = await getHomePage(page);
  return posts.map((post) => <PostCard key={post.slug} post={post} />);
}

export async function loadTagPage(tagId: number, page: number) {
  if (!parsePageParam(String(page))) return [];
  const { posts } = await getPublishedPostsTagged(tagId, page);
  return posts.map((post) => <PostListItem key={post.slug} post={post} />);
}
