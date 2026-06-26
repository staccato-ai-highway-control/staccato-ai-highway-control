import { ResourceForm } from "@/components/resources/ResourceForm";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ResourceForm resourceId={id} />;
}
