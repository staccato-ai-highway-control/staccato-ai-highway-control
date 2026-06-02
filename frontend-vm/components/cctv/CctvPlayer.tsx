import type { Cctv } from "@/features/cctvs/types";

export function CctvPlayer({ cctv }: { cctv: Cctv }) {
  const mediaUrl = cctv.streamUrl || cctv.imageUrl;

  return (
    <div className="relative h-[520px] overflow-hidden rounded-xl bg-slate-900">
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={`${cctv.cctvCode ?? cctv.id} stream`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}
