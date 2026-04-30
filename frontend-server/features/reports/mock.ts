import type { Report } from "./types";

export const mockReports: Report[] = [
  {
    id: "rep-001",
    title: "수원IC 주행차로 정차 신고 영상",
    reportType: "LANE_STOP_REPORT",
    purpose: "REPORT",
    location: "경부고속도로 수원IC",
    cctvId: "cctv-001",
    analysisStatus: "COMPLETED",
    createdAt: "2026-04-29 09:20:00",
    attachmentName: "suwon_lane_stop.mp4",
  },
];
