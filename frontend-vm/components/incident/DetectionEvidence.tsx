import type { Incident } from "@/features/incidents/types";

export function DetectionEvidence({ incident }: { incident: Incident }) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <img src={incident.snapshotUrl} alt="AI 탐지 증거" className="h-80 w-full object-cover" />
      <div className="absolute left-[42%] top-[42%] h-20 w-32 border-4 border-staccato" />
      <div className="absolute inset-x-8 bottom-10 h-20 border-2 border-dashed border-emerald-400" />
    </div>
  );
}
