import { apiClient, type ApiEnvelope } from "@/lib/apiClient";
import type { ChatbotAnswer, ChatbotIncidentContext } from "./types";
export type { ChatbotAnswer, ChatbotIncidentContext } from "./types";

export function askChatbot(message: string, incidentContext: ChatbotIncidentContext) {
  return apiClient<ApiEnvelope<ChatbotAnswer>>("/chatbot/answer", {
    method: "POST",
    auth: false,
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
    auth: false,
    body: {
      message,
      incident_context: incidentContext,
    },
  });
}
