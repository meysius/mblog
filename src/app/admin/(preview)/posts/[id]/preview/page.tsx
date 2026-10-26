import { PreviewPage, previewMetadata } from "../../../preview";

export function generateMetadata({ params }: PageProps<"/admin/posts/[id]/preview">) {
  return previewMetadata("post", params);
}

export default function PostPreviewPage({ params }: PageProps<"/admin/posts/[id]/preview">) {
  return <PreviewPage kind="post" params={params} />;
}
