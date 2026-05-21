"use client";

type ReportLocationFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (location: { label: string; latitude: number; longitude: number }) => void;
};

export function ReportLocationForm({ value, onChange }: ReportLocationFormProps) {
  return (
    <input
      name="location"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
      className="h-11 rounded-lg border border-slate-200 px-3"
      placeholder="예: 경부고속도로 수원IC 123.4K"
    />
  );
}
