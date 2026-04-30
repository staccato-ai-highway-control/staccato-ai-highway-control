import type { LlmReport } from "./types";

export const mockLlmReports: LlmReport[] = [
  {
    id: "llm-001",
    incidentId: "inc-001",
    draft:
      "경부고속도로 수원IC 123.4K 주행차로에서 정차 차량이 탐지되었습니다. AI 신뢰도는 94.2%이며 정차 지속 시간은 72초입니다. 위험도는 긴급으로 분류되어 관제 확인과 현장 출동 요청이 필요합니다.",
    verified: false,
    updatedAt: "2026-04-29 09:16:00",
  },
];
