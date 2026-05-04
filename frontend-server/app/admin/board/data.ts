export type BoardCategory = "NOTICE" | "RESOURCE" | "DISCUSSION";

export type AdminBoardPost = {
  id: string;
  title: string;
  category: BoardCategory;
  author: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  content: string;
};

export const categoryLabels: Record<BoardCategory, string> = {
  NOTICE: "공지",
  RESOURCE: "자료",
  DISCUSSION: "토론",
};

export const categoryTone: Record<BoardCategory, "blue" | "green" | "amber"> = {
  NOTICE: "blue",
  RESOURCE: "green",
  DISCUSSION: "amber",
};

export const boardPosts: AdminBoardPost[] = [
  {
    id: "1",
    title: "5월 관제센터 정기 점검 안내",
    category: "NOTICE",
    author: "STACCATO Super Admin",
    createdAt: "2026. 05. 04. 09:10",
    updatedAt: "2026. 05. 04. 09:10",
    views: 42,
    content:
      "5월 정기 점검은 2026년 5월 8일 02:00부터 04:00까지 진행됩니다. 점검 시간 동안 일부 관제 화면의 실시간 갱신이 지연될 수 있습니다.",
  },
  {
    id: "2",
    title: "CCTV 장애 대응 매뉴얼 v1.2",
    category: "RESOURCE",
    author: "김관리",
    createdAt: "2026. 05. 02. 14:35",
    updatedAt: "2026. 05. 03. 10:12",
    views: 31,
    content:
      "CCTV 스트림 단절, ROI 오탐, AI 탐지 지연 상황별 점검 절차를 정리했습니다. 현장 점검 전 네트워크 상태와 장비 전원 로그를 먼저 확인해주세요.",
  },
  {
    id: "3",
    title: "야간 정차 차량 알림 기준 조정 의견",
    category: "DISCUSSION",
    author: "이순찰",
    createdAt: "2026. 04. 30. 18:20",
    updatedAt: "2026. 04. 30. 18:20",
    views: 18,
    content:
      "야간 시간대 갓길 정차 알림이 다소 민감하게 발생한다는 의견이 있어 기준 조정이 필요한지 논의하고자 합니다.",
  },
];

export function getBoardPost(id: string) {
  return boardPosts.find((post) => post.id === id);
}
