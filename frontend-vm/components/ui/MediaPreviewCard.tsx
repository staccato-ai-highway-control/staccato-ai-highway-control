import type { ReactNode } from "react";
import { DetailCard } from "./DetailCard";

export function MediaPreviewCard({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <DetailCard title={title} description={description} actions={actions}>
      <div className="aspect-video max-h-[520px] w-full overflow-hidden rounded-2xl bg-slate-950 [&_img]:h-full [&_img]:w-full [&_img]:object-contain [&_video]:h-full [&_video]:w-full [&_video]:object-contain">{children}</div>
    </DetailCard>
  );
}
