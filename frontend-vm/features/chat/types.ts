export type ChatRoomType = "INCIDENT" | "GROUP" | "DM";
export type ChatRoomStatus = "OPEN" | "CLOSED" | "DELETED";

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

export type ChatMessagesDto = {
  room_id: number;
  messages: ChatMessageDto[];
};

export type CreateChatRoomRequest =
  | { room_type: "GROUP"; member_ids: number[] }
  | { room_type: "DM"; member_id: number };

export type AssignIncidentChatRoomRequest = {
  responder_user_id: number;
  admin_user_ids: number[];
};
