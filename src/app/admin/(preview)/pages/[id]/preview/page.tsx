import { PreviewPage, previewMetadata } from "../../../preview";

export function generateMetadata({ params }: PageProps<"/admin/pages/[id]/preview">) {
  return previewMetadata("page", params);
}

export default function PagePreviewPage({ params }: PageProps<"/admin/pages/[id]/preview">) {
  return <PreviewPage kind="page" params={params} />;
}
