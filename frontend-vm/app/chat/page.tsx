"use client";

import { Send, ShieldAlert } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { cn } from "@/lib/utils";

type ChatMessageType = "TEXT" | "SYSTEM" | "INCIDENT_UPDATE";

type ChatMessage = {
  id: string;
  roomId: string;
  senderName: string;
  senderRole: string;
  messageType: ChatMessageType;
  content: string;
  createdAt: string;
};

type ChatRoom = {
  id: string;
  roomCode: string;
  incidentCode: string;
  title: string;
  lastMessage: string;
  unreadCount: number;
  status: "ACTIVE" | "MONITORING" | "CLOSED";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

const mockChatRooms: ChatRoom[] = [
  {
    id: "room-001",
    roomCode: "CHAT-20260429-001",
    incidentCode: "STP-20260429-001",
    title: "수원IC 주행차로 정차 긴급 대응",
    lastMessage: "순찰차 8분 내 현장 접근 예정입니다.",
    unreadCount: 3,
    status: "ACTIVE",
    riskLevel: "CRITICAL",
  },
  {
    id: "room-002",
    roomCode: "CHAT-20260429-002",
    incidentCode: "STP-20260429-002",
    title: "용인IC 갓길 장기 정차 확인",
    lastMessage: "운전자 안전 여부 확인 요청했습니다.",
    unreadCount: 1,
    status: "MONITORING",
    riskLevel: "MEDIUM",
  },
  {
    id: "room-003",
    roomCode: "CHAT-20260428-011",
    incidentCode: "STP-20260428-011",
    title: "대소JC 갓길 정차 처리 완료",
    lastMessage: "상황 종료 보고 완료했습니다.",
    unreadCount: 0,
    status: "CLOSED",
    riskLevel: "LOW",
  },
];

const initialMessages: ChatMessage[] = [
  {
    id: "msg-001",
    roomId: "room-001",
    senderName: "시스템",
    senderRole: "SYSTEM",
    messageType: "SYSTEM",
    content: "STP-20260429-001 사고 대응 채팅방이 생성되었습니다.",
    createdAt: "2026-04-29 09:12:35",
  },
  {
    id: "msg-002",
    roomId: "room-001",
    senderName: "김관제",
    senderRole: "최고관리자",
    messageType: "TEXT",
    content: "경부고속도로 수원IC 1차로 정차 차량 확인 바랍니다.",
    createdAt: "2026-04-29 09:13:10",
  },
  {
    id: "msg-003",
    roomId: "room-001",
    senderName: "박순찰",
    senderRole: "현장 담당",
    messageType: "TEXT",
    content: "순찰차 출동했습니다. 현장까지 약 8분 예상됩니다.",
    createdAt: "2026-04-29 09:15:02",
  },
  {
    id: "msg-004",
    roomId: "room-001",
    senderName: "사고 상태",
    senderRole: "INCIDENT_UPDATE",
    messageType: "INCIDENT_UPDATE",
    content: "사고 상태가 REVIEWING에서 ASSIGNED로 변경되었습니다.",
    createdAt: "2026-04-29 09:16:40",
  },
  {
    id: "msg-005",
    roomId: "room-002",
    senderName: "시스템",
    senderRole: "SYSTEM",
    messageType: "SYSTEM",
    content: "갓길 정차 사고 대응 채팅방이 생성되었습니다.",
    createdAt: "2026-04-29 09:04:15",
  },
  {
    id: "msg-006",
    roomId: "room-002",
    senderName: "이관제",
    senderRole: "관제 담당",
    messageType: "TEXT",
    content: "비상등 점등 여부 CCTV 확대 확인 부탁드립니다.",
    createdAt: "2026-04-29 09:05:22",
  },
  {
    id: "msg-007",
    roomId: "room-003",
    senderName: "시스템",
    senderRole: "SYSTEM",
    messageType: "SYSTEM",
    content: "사고 대응이 종료되었습니다.",
    createdAt: "2026-04-28 18:35:00",
  },
];

const statusLabels: Record<ChatRoom["status"], string> = {
  ACTIVE: "대응중",
  MONITORING: "관찰중",
  CLOSED: "종료",
};

const riskTone: Record<ChatRoom["riskLevel"], "slate" | "blue" | "green" | "amber" | "red"> = {
  LOW: "green",
  MEDIUM: "blue",
  HIGH: "amber",
  CRITICAL: "red",
};

function formatNow() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

export default function ChatPage() {
  const [selectedRoomId, setSelectedRoomId] = useState(mockChatRooms[0].id);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");

  const selectedRoom = mockChatRooms.find((room) => room.id === selectedRoomId) ?? mockChatRooms[0];

  const selectedMessages = useMemo(() => {
    return messages.filter((message) => message.roomId === selectedRoom.id);
  }, [messages, selectedRoom.id]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();
    if (!content) return;

    setMessages((current) => [
      ...current,
      {
        id: `msg-local-${current.length + 1}`,
        roomId: selectedRoom.id,
        senderName: "김관제",
        senderRole: "최고관리자",
        messageType: "TEXT",
        content,
        createdAt: formatNow(),
      },
    ]);
    setDraft("");
  }

  return (
    <RequireAuth>
      <AppLayout title="사고 대응 채팅">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">사고 대응 채팅</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            사고별 채팅방에서 관제자와 담당자가 대응 상황을 공유합니다.
          </p>
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-black text-slate-950">채팅방 목록</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">사고 대응 전용 채팅방</p>
            </div>
            <div className="max-h-[680px] overflow-y-auto p-3">
              {mockChatRooms.map((room) => {
                const active = room.id === selectedRoom.id;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      "mb-2 w-full rounded-lg border p-4 text-left transition last:mb-0 hover:bg-slate-50",
                      active ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-400">{room.roomCode}</p>
                        <b className="mt-1 block truncate text-sm text-slate-950">{room.title}</b>
                      </div>
                      {room.unreadCount > 0 ? (
                        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-staccato px-2 text-xs font-black text-white">
                          {room.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{room.incidentCode}</p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-600">{room.lastMessage}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={riskTone[room.riskLevel]}>{room.riskLevel}</Badge>
                      <Badge tone={room.status === "CLOSED" ? "slate" : "blue"}>{statusLabels[room.status]}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="flex min-h-[720px] flex-col overflow-hidden">
            <header className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400">{selectedRoom.roomCode}</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{selectedRoom.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {selectedRoom.incidentCode} 사고 대응 채팅방
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={riskTone[selectedRoom.riskLevel]}>{selectedRoom.riskLevel}</Badge>
                  <Badge tone={selectedRoom.status === "CLOSED" ? "slate" : "blue"}>{statusLabels[selectedRoom.status]}</Badge>
                </div>
              </div>
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                TODO: Socket.IO 실시간 채팅 연결은 백엔드 이벤트 계약 확정 후 추가합니다.
              </p>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5">
              <div className="grid gap-4">
                {selectedMessages.map((message) => {
                  const isMine = message.senderName === "김관제";
                  const isSystem = message.messageType !== "TEXT";

                  return (
                    <article
                      key={message.id}
                      className={cn(
                        "max-w-[82%] rounded-xl border p-4",
                        isSystem
                          ? "mx-auto border-slate-200 bg-white text-center"
                          : isMine
                            ? "ml-auto border-teal-100 bg-teal-700 text-white"
                            : "mr-auto border-slate-200 bg-white"
                      )}
                    >
                      <div className={cn("mb-2 flex items-center gap-2", isSystem ? "justify-center" : isMine ? "justify-end" : "justify-start")}>
                        {message.messageType === "INCIDENT_UPDATE" ? <ShieldAlert className="h-4 w-4" aria-hidden="true" /> : null}
                        <b className={cn("text-sm", isMine ? "text-white" : "text-slate-950")}>{message.senderName}</b>
                        <span className={cn("text-xs font-semibold", isMine ? "text-teal-100" : "text-slate-400")}>{message.senderRole}</span>
                      </div>
                      <p className={cn("text-sm font-semibold leading-6", isMine ? "text-white" : "text-slate-700")}>{message.content}</p>
                      <time className={cn("mt-2 block text-xs font-semibold", isMine ? "text-teal-100" : "text-slate-400")}>{message.createdAt}</time>
                    </article>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="사고 대응 메시지를 입력하세요."
                  className="h-12 min-w-0 flex-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-teal-600"
                />
                <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-black text-white transition hover:bg-teal-800">
                  <Send className="h-4 w-4" aria-hidden="true" />
                  전송
                </button>
              </div>
            </form>
          </Card>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
