import type { Cctv } from "@/features/cctvs/types";

export function CctvPlayer({ cctv }: { cctv: Cctv }) {
  return (
    <div className="cctv-noise relative h-[520px] overflow-hidden rounded-xl">
      <span className="absolute left-4 top-4 rounded bg-red-500 px-2 py-1 text-xs font-black text-white">LIVE</span>
      <b className="absolute bottom-4 left-4 text-xl text-white">{cctv.road} {cctv.name}</b>
    </div>
  );
}

