import type { Metadata } from "next";
import { createTag } from "../../../tag-actions";
import { BackToTags } from "../back-link";
import { TagForm } from "../tag-form";

export const metadata: Metadata = { title: "New tag" };

export default function NewTagPage() {
  return (
    <>
      <BackToTags />
      <h1 className="mt-3 mb-8 text-2xl font-semibold tracking-tight">New tag</h1>
      <TagForm action={createTag} />
    </>
  );
}
