import type { Metadata } from "next";
import { createPost } from "../../actions";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return <PostEditor action={createPost} />;
}
