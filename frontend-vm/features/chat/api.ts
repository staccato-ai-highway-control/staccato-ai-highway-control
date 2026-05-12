import { apiClient } from "@/lib/apiClient";

export type ChatbotIncidentContext = {
  incident_type: string;
  risk_level: string;
  location: string;
  stopped_seconds: number;
  [key: string]: unknown;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ChatbotAnswer = {
  answer: string;
  llm_model: string;
  llm_provider: string;
  prompt_version: string;
};

export type ChatRoomDto = {
  id: number;
  incident_id: number;
  title: string;
  status: string;
  created_at: string;
};

export type ChatMessageDto = {
  id: number;
  room_id: number;
  sender_id: number;
  content: string;
  message_type: "TEXT" | "SYSTEM" | "INCIDENT_UPDATE";
  created_at: string;
};

export type ChatMessagesDto = {
  room_id: number;
  messages: ChatMessageDto[];
};

export function askChatbot(message: string, incidentContext: ChatbotIncidentContext) {
  return apiClient<ApiEnvelope<ChatbotAnswer>>("/chatbot/answer", {
    method: "POST",
    body: {
      message,
      incident_context: incidentContext,
    },
  });
}

export function askIncidentChatbot(
  incidentId: number,
  message: string,
  incidentContext: ChatbotIncidentContext
) {
  return apiClient<ApiEnvelope<ChatbotAnswer>>(`/incidents/${incidentId}/chatbot/answer`, {
    method: "POST",
    body: {
      message,
      incident_context: incidentContext,
    },
  });
}

export function getOrCreateChatRoom(incidentId: number) {
  return apiClient<ApiEnvelope<ChatRoomDto>>(`/incidents/${incidentId}/chat-room`, {
    method: "POST",
  });
}

export function sendChatMessage(roomId: number, senderId: number, content: string) {
  return apiClient<ApiEnvelope<ChatMessageDto>>(`/chat-rooms/${roomId}/messages`, {
    method: "POST",
    body: {
      sender_id: senderId,
      content,
    },
  });
}

export function getChatMessages(roomId: number) {
  return apiClient<ApiEnvelope<ChatMessagesDto>>(`/chat-rooms/${roomId}/messages`);
}
