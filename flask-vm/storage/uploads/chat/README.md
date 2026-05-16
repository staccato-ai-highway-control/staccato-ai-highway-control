# chat files

채팅 첨부파일 저장 영역입니다.

사용 대상:
- 채팅 이미지
- 채팅 첨부파일

주의:
- 현재 DB 구조상 chat_messages.attachment_id가 board_attachments를 참조할 수 있으므로,
  실제 구현 시 board_attachments 재사용 여부를 먼저 확정해야 합니다.
