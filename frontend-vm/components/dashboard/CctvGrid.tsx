import Link from "next/link";
import { Card } from "@/components/common/Card";
import { mockCctvs } from "@/features/cctvs/mock";

export function CctvGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {mockCctvs.slice(0, 4).map((cctv) => (
        <Link key={cctv.id} href={`/cctvs/${cctv.id}`} className="no-underline">
          <Card className="overflow-hidden">
            <div className="cctv-noise grid h-40 place-items-center text-white">
              <span className="rounded bg-red-500 px-2 py-1 text-xs font-black">AI ROI READY</span>
            </div>
            <div className="p-4">
              <b className="text-slate-950">
                {cctv.road} {cctv.name}
              </b>
              <p className="mt-1 text-sm text-slate-500">
                {cctv.location} · {cctv.status}
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
