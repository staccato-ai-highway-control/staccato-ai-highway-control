export type ChatbotIncidentContext = {
  incident_type: string;
  risk_level: string;
  [key: string]: unknown;
};

export type ChatbotAnswer = {
  answer: string;
  llm_model?: string;
  llm_provider?: string;
  prompt_version?: string;
};
