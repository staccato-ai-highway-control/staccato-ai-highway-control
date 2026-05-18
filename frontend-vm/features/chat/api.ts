import { apiClient, type ApiEnvelope } from "@/lib/apiClient";
import type { ChatMessageDto, ChatMessagesDto, ChatRoomDto } from "./types";
export type { ChatbotAnswer, ChatbotIncidentContext, ChatMessageDto, ChatMessagesDto, ChatRoomDto } from "./types";

export function getOrCreateChatRoom(incidentId: number) {
  return apiClient<ApiEnvelope<ChatRoomDto>>(`/incidents/${incidentId}/chat-room`, {
    method: "POST",
  });
}

export function sendChatMessage(roomId: number, content: string) {
  return apiClient<ApiEnvelope<ChatMessageDto>>(`/chat-rooms/${roomId}/messages`, {
    method: "POST",
    body: { content },
  });
}

export function getChatMessages(roomId: number) {
  return apiClient<ApiEnvelope<ChatMessagesDto>>(`/chat-rooms/${roomId}/messages`);
}
