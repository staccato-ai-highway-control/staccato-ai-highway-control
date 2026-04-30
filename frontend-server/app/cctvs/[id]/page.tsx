import { AppLayout } from "@/components/layout/AppLayout";
import { CctvPlayer } from "@/components/cctv/CctvPlayer";
import { RoiOverlay } from "@/components/cctv/RoiOverlay";
import { AiDetectionOverlay } from "@/components/cctv/AiDetectionOverlay";
import { getCctv } from "@/features/cctvs/api";

export default async function CctvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cctv = await getCctv(id);
  return (
    <AppLayout title="CCTV 상세">
      <div className="relative">
        <CctvPlayer cctv={cctv} />
        <RoiOverlay />
        <AiDetectionOverlay />
      </div>
    </AppLayout>
  );
}
