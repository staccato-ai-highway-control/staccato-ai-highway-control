import { Card } from "@/components/common/Card";

export function DetectionChart() {
  const bars = [38, 72, 54, 86, 64, 48];
  return (
    <Card className="p-5">
      <h2 className="font-black">정차 탐지 추이</h2>
      <div className="mt-6 flex h-52 items-end gap-4">
        {bars.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <span className="w-full rounded-t bg-staccato" style={{ height: `${value}%` }} />
            <small className="text-xs text-slate-500">{8 + index * 2}:00</small>
          </div>
        ))}
      </div>
    </Card>
  );
}
