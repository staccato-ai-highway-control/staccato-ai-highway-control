export type ChatbotIncidentContext = {
  incident_type: string;
  risk_level: string;
  location?: string;
  stopped_seconds?: number;
  [key: string]: unknown;
};

export type ChatbotAnswer = {
  answer: string;
  llm_model?: string;
  llm_provider?: string;
  prompt_version?: string;
};

export type ChatRoomDto = {
  id: number;
  incident_id: number;
  title?: string;
  status?: string;
  created_at?: string;
};

export type ChatMessageDto = {
  id: number;
  room_id: number;
  sender_id?: number;
  sender_user_id?: number;
  sender_name?: string;
  content: string;
  message_type: "TEXT" | "SYSTEM" | "INCIDENT_UPDATE";
  created_at: string;
};

export type ChatMessagesDto = {
  room_id: number;
  messages: ChatMessageDto[];
};
