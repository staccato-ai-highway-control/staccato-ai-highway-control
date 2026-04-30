import { AppLayout } from "@/components/layout/AppLayout";
import { IncidentListTable } from "@/components/incident/IncidentListTable";
import { getIncidents } from "@/features/incidents/api";

export default async function IncidentsPage() {
  const incidents = await getIncidents();
  return (
    <AppLayout title="정차 이벤트">
      <IncidentListTable incidents={incidents} />
    </AppLayout>
  );
}
