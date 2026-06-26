import { ResourceDetail } from "@/components/resources/ResourceDetail";

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ResourceDetail resourceId={id} />;
}
