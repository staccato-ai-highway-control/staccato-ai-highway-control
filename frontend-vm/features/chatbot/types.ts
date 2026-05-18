export type ChatbotIncidentContext = {
  incident_type?: string;
  risk_level?: string;
  [key: string]: unknown;
};

export type ChatbotAnswer = {
  answer: string;
  llm_model?: string;
  llm_provider?: string;
  prompt_version?: string;
};

export type ChatbotSessionStatus = "OPEN" | "CLOSED";
export type ChatbotSenderType = "USER" | "BOT" | "SYSTEM";

export type ChatbotSessionDto = {
  id: number;
  incident_id?: number;
  conversation_status?: ChatbotSessionStatus;
  status?: ChatbotSessionStatus;
  created_at?: string;
  closed_at?: string | null;
};

export type ChatbotMessageDto = {
  id: number;
  session_id: number;
  sender_type: ChatbotSenderType;
  message?: string;
  content?: string;
  created_at?: string;
};
