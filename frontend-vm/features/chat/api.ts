/**
 * 파일 역할: 채팅 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient, type ApiEnvelope } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type {
  AssignIncidentChatRoomRequest,
  ChatMessageDto,
  ChatMessagesDto,
  ChatRoomDto,
  ChatRoomStatus,
  CreateChatRoomRequest,
} from "./types";
// 코드 설명: 다른 모듈이 이 기능을 재사용할 수 있도록 공개 API로 다시 내보냅니다.
export type { ChatMessageDto, ChatMessagesDto, ChatRoomDto } from "./types";

// 코드 설명: getOrCreateChatRoom 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getOrCreateChatRoom(incidentId: number | string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat…
  return apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat-room', {
    method: "POST",
  });
}

// 코드 설명: assignIncidentChatRoom 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function assignIncidentChatRoom(incidentId: number | string, payload: AssignIncidentChatRoomRequest) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat…
  return apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat-room/assign', {
    method: "POST",
    body: payload,
  });
}

// 코드 설명: updateIncidentChatRoomStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function updateIncidentChatRoomStatus(incidentId: number | string, room_status: ChatRoomStatus) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat…
  return apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat-room/status', {
    method: "PATCH",
    body: { room_status },
  });
}

// 코드 설명: createChatRoom 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function createChatRoom(payload: CreateChatRoomRequest) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatRoomDto>>("/chat-rooms", { method: "POST", bo…
  return apiClient<ApiEnvelope<ChatRoomDto>>("/chat-rooms", {
    method: "POST",
    body: payload,
  });
}

// 코드 설명: getChatRooms 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getChatRooms() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatRoomDto[]> | { rooms: ChatRoomDto[] }>("/chat…
  return apiClient<ApiEnvelope<ChatRoomDto[]> | { rooms: ChatRoomDto[] }>("/chat-rooms");
}

// 코드 설명: getChatRoom 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getChatRoom(roomId: number | string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatRoomDto>>('/chat-rooms/' + roomId)
  return apiClient<ApiEnvelope<ChatRoomDto>>('/chat-rooms/' + roomId);
}

// 코드 설명: deleteChatRoom 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteChatRoom(roomId: number | string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient('/chat-rooms/' + roomId, { method: "DELETE" })
  return apiClient('/chat-rooms/' + roomId, { method: "DELETE" });
}

// 코드 설명: addChatRoomMembers 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function addChatRoomMembers(roomId: number | string, member_ids: number[]) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatRoomDto>>('/chat-rooms/' + roomId + '/members…
  return apiClient<ApiEnvelope<ChatRoomDto>>('/chat-rooms/' + roomId + '/members', {
    method: "POST",
    body: { member_ids },
  });
}

// 코드 설명: leaveChatRoom 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function leaveChatRoom(roomId: number | string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient('/chat-rooms/' + roomId + '/members/me', { method: "DELETE" })
  return apiClient('/chat-rooms/' + roomId + '/members/me', { method: "DELETE" });
}

// 코드 설명: sendChatMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function sendChatMessage(roomId: number | string, content: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatMessageDto>>('/chat-rooms/' + roomId + '/mess…
  return apiClient<ApiEnvelope<ChatMessageDto>>('/chat-rooms/' + roomId + '/messages', {
    method: "POST",
    body: { content },
  });
}

// 코드 설명: getChatMessages 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getChatMessages(roomId: number | string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ApiEnvelope<ChatMessagesDto> | { messages: ChatMessageDto[] }…
  return apiClient<ApiEnvelope<ChatMessagesDto> | { messages: ChatMessageDto[] }>('/chat-rooms/' + roomId + '/messages');
}

// 코드 설명: deleteChatMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteChatMessage(roomId: number | string, messageId: number | string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient('/chat-rooms/' + roomId + '/messages/' + messageId, { method:…
  return apiClient('/chat-rooms/' + roomId + '/messages/' + messageId, { method: "DELETE" });
}

// 코드 설명: markChatRoomRead 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function markChatRoomRead(roomId: number | string, message_id: number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient('/chat-rooms/' + roomId + '/read', { method: "PATCH", body: {…
  return apiClient('/chat-rooms/' + roomId + '/read', {
    method: "PATCH",
    body: { message_id },
  });
}
