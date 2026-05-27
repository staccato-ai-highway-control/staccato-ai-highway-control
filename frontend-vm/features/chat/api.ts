import { apiClient, type ApiEnvelope } from "@/lib/apiClient";
import type {
  AssignIncidentChatRoomRequest,
  ChatMessageDto,
  ChatMessagesDto,
  ChatRoomDto,
  ChatRoomStatus,
  CreateChatRoomRequest,
} from "./types";
export type { ChatbotAnswer, ChatbotIncidentContext, ChatMessageDto, ChatMessagesDto, ChatRoomDto } from "./types";

export function getOrCreateChatRoom(incidentId: number | string) {
  return apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat-room', {
    method: "POST",
  });
}

export function assignIncidentChatRoom(incidentId: number | string, payload: AssignIncidentChatRoomRequest) {
  return apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat-room/assign', {
    method: "POST",
    body: payload,
  });
}

export function updateIncidentChatRoomStatus(incidentId: number | string, room_status: ChatRoomStatus) {
  return apiClient<ApiEnvelope<ChatRoomDto>>('/incidents/' + incidentId + '/chat-room/status', {
    method: "PATCH",
    body: { room_status },
  });
}

export function createChatRoom(payload: CreateChatRoomRequest) {
  return apiClient<ApiEnvelope<ChatRoomDto>>("/chat-rooms", {
    method: "POST",
    body: payload,
  });
}

export function getChatRooms() {
  return apiClient<ApiEnvelope<ChatRoomDto[]> | { rooms: ChatRoomDto[] }>("/chat-rooms");
}

export function getChatRoom(roomId: number | string) {
  return apiClient<ApiEnvelope<ChatRoomDto>>('/chat-rooms/' + roomId);
}

export function deleteChatRoom(roomId: number | string) {
  return apiClient('/chat-rooms/' + roomId, { method: "DELETE" });
}

export function addChatRoomMembers(roomId: number | string, member_ids: number[]) {
  return apiClient<ApiEnvelope<ChatRoomDto>>('/chat-rooms/' + roomId + '/members', {
    method: "POST",
    body: { member_ids },
  });
}

export function leaveChatRoom(roomId: number | string) {
  return apiClient('/chat-rooms/' + roomId + '/members/me', { method: "DELETE" });
}

export function sendChatMessage(roomId: number | string, content: string) {
  return apiClient<ApiEnvelope<ChatMessageDto>>('/chat-rooms/' + roomId + '/messages', {
    method: "POST",
    body: { content },
  });
}

export function getChatMessages(roomId: number | string) {
  return apiClient<ApiEnvelope<ChatMessagesDto> | { messages: ChatMessageDto[] }>('/chat-rooms/' + roomId + '/messages');
}

export function deleteChatMessage(roomId: number | string, messageId: number | string) {
  return apiClient('/chat-rooms/' + roomId + '/messages/' + messageId, { method: "DELETE" });
}

export function markChatRoomRead(roomId: number | string, message_id: number) {
  return apiClient('/chat-rooms/' + roomId + '/read', {
    method: "PATCH",
    body: { message_id },
  });
}
