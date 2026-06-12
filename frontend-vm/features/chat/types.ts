/**
 * 파일 역할: 채팅 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type ChatRoomType = "INCIDENT" | "GROUP" | "DM";
// 코드 설명: ChatRoomStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ChatRoomStatus = "OPEN" | "CLOSED" | "DELETED";

// 코드 설명: ChatRoomDto 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ChatRoomDto = {
  id: number;
  incident_id?: number;
  title?: string;
  room_type?: ChatRoomType;
  room_status?: ChatRoomStatus;
  status?: ChatRoomStatus | string;
  created_at?: string;
  deleted_at?: string | null;
  last_message?: string;
  unread_count?: number;
};

// 코드 설명: ChatMessageDto 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ChatMessageDto = {
  id: number;
  room_id: number;
  sender_id?: number;
  sender_user_id?: number;
  sender_name?: string;
  sender_type?: "USER" | "SYSTEM";
  content: string;
  message_type: "TEXT" | "SYSTEM" | "INCIDENT_UPDATE";
  created_at: string;
  deleted_at?: string | null;
};

// 코드 설명: ChatMessagesDto 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ChatMessagesDto = {
  room_id: number;
  messages: ChatMessageDto[];
};

// 코드 설명: CreateChatRoomRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CreateChatRoomRequest =
  | { room_type: "GROUP"; member_ids: number[] }
  | { room_type: "DM"; member_id: number };

// 코드 설명: AssignIncidentChatRoomRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type AssignIncidentChatRoomRequest = {
  responder_user_id: number;
  admin_user_ids: number[];
};
