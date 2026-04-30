import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { mockCctvs } from "@/features/cctvs/mock";

export default function CctvsPage() {
  return (
    <AppLayout title="CCTV 관제">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockCctvs.map((cctv) => (
          <Link key={cctv.id} href={`/cctvs/${cctv.id}`} className="no-underline">
            <Card className="p-5">
              <div className="cctv-noise mb-4 h-40 rounded-lg" />
              <b className="text-slate-950">
                {cctv.road} {cctv.name}
              </b>
              <p className="mt-2 text-sm text-slate-500">
                {cctv.location} · ROI {cctv.roiTypes.join(", ")}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
