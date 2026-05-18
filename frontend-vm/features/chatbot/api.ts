import { apiClient, type ApiEnvelope } from "@/lib/apiClient";
import type {
  ChatbotAnswer,
  ChatbotIncidentContext,
  ChatbotMessageDto,
  ChatbotSessionDto,
  ChatbotSessionStatus,
} from "./types";
export type { ChatbotAnswer, ChatbotIncidentContext, ChatbotMessageDto, ChatbotSessionDto } from "./types";

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
  incidentId: number | string,
  message: string,
  incidentContext: ChatbotIncidentContext
) {
  return apiClient<ApiEnvelope<ChatbotAnswer>>('/incidents/' + incidentId + '/chatbot/answer', {
    method: "POST",
    body: {
      message,
      incident_context: incidentContext,
    },
  });
}

export function createIncidentChatbotSession(incidentId: number | string) {
  return apiClient<ApiEnvelope<ChatbotSessionDto>>('/incidents/' + incidentId + '/chatbot-sessions', {
    method: "POST",
  });
}

export function getIncidentChatbotSessions(incidentId: number | string) {
  return apiClient<ApiEnvelope<ChatbotSessionDto[]> | { sessions: ChatbotSessionDto[] }>('/incidents/' + incidentId + '/chatbot-sessions');
}

export function getChatbotSession(sessionId: number | string) {
  return apiClient<ApiEnvelope<ChatbotSessionDto>>('/chatbot-sessions/' + sessionId);
}

export function getChatbotSessionMessages(sessionId: number | string) {
  return apiClient<ApiEnvelope<ChatbotMessageDto[]> | { messages: ChatbotMessageDto[] }>('/chatbot-sessions/' + sessionId + '/messages');
}

export function sendChatbotSessionMessage(sessionId: number | string, message: string) {
  return apiClient<ApiEnvelope<ChatbotMessageDto>>('/chatbot-sessions/' + sessionId + '/messages', {
    method: "POST",
    body: { message },
  });
}

export function closeChatbotSession(sessionId: number | string) {
  return apiClient<ApiEnvelope<{ status: ChatbotSessionStatus }>>('/chatbot-sessions/' + sessionId + '/close', {
    method: "PATCH",
  });
}
