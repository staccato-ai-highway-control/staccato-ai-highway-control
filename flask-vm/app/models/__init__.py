"""SQLAlchemy 모델을 한 import 경로로 노출하는 모델 패키지.

애플리케이션 초기화 시 모든 테이블 메타데이터가 등록되도록 모델을 모아 내보낸다."""

# 설명: app.models.auth_models에서 EmailVerification, IdentityOAuthState, SecurityLog, SignupRequest, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models.auth_models import (
    EmailVerification,
    IdentityOAuthState,
    SecurityLog,
    SignupRequest,
    User,
)

# 설명: app.models.report_models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
from app.models.report_models import (
    IncidentReport,
    ReportAnalysisJob,
    ReportAttachment,
)

# 설명: app.models.report_support_models에서 ReportLocation, ReportMemo, ReportStatusHistory 이름을 가져와 아래 로직에서 재사용한다.
from app.models.report_support_models import (
    ReportLocation,
    ReportMemo,
    ReportStatusHistory,
)

# 설명: app.models.incident_models에서 DetectionLog, Incident, IncidentSnapshot 이름을 가져와 아래 로직에서 재사용한다.
from app.models.incident_models import (
    DetectionLog,
    Incident,
    IncidentSnapshot,
)

# 설명: app.models.incident_support_models에서 IncidentMemo, IncidentStatusHistory 이름을 가져와 아래 로직에서 재사용한다.
from app.models.incident_support_models import (
    IncidentMemo,
    IncidentStatusHistory,
)

# 설명: app.models.board_models에서 BoardAttachment, BoardComment, BoardPost 이름을 가져와 아래 로직에서 재사용한다.
from app.models.board_models import (
    BoardAttachment,
    BoardComment,
    BoardPost,
)

# 설명: app.models.board_support_models에서 BoardReaction 이름을 가져와 아래 로직에서 재사용한다.
from app.models.board_support_models import (
    BoardReaction,
)

# 설명: app.models.bug_report_models에서 BugReport, BugReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
from app.models.bug_report_models import (
    BugReport,
    BugReportAttachment,
)

# 설명: app.models.resource_models에서 ProjectResource 이름을 가져와 아래 로직에서 재사용한다.
from app.models.resource_models import (
    ProjectResource,
)

# 설명: app.models.its_models에서 ExternalApiLog, ItsRiskScore, ItsTrafficSnapshot, ItsWeatherSnapshot 이름을 가져와 아래 로직에서 재사용한다.
from app.models.its_models import (
    ExternalApiLog,
    ItsRiskScore,
    ItsTrafficSnapshot,
    ItsWeatherSnapshot,
)

# 설명: app.models.its_support_models에서 ItsApiSource, RiskCalculationLog, RiskContextSnapshot 이름을 가져와 아래 로직에서 재사용한다.
from app.models.its_support_models import (
    ItsApiSource,
    RiskCalculationLog,
    RiskContextSnapshot,
)

# 설명: app.models.notification_models에서 Notification, NotificationDelivery 이름을 가져와 아래 로직에서 재사용한다.
from app.models.notification_models import (
    Notification,
    NotificationDelivery,
)

# 설명: app.models.realtime_models에서 RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models.realtime_models import (
    RealtimeEvent,
)

# 설명: app.models.ai_event_models에서 AiEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models.ai_event_models import (
    AiEvent,
)

# 설명: app.models.chat_models에서 ChatMessage, ChatMessageRead, ChatRoom 이름을 가져와 아래 로직에서 재사용한다.
from app.models.chat_models import (
    ChatMessage,
    ChatMessageRead,
    ChatRoom,
)

# 설명: app.models.chat_support_models에서 ChatRoomMember 이름을 가져와 아래 로직에서 재사용한다.
from app.models.chat_support_models import (
    ChatRoomMember,
)

# 설명: app.models.cctv_models에서 Cctv, CctvRoi, CctvSlot, CctvStatusLog 이름을 가져와 아래 로직에서 재사용한다.
from app.models.cctv_models import (
    Cctv,
    CctvRoi,
    CctvSlot,
    CctvStatusLog,
)

# 설명: app.models.mlops_models에서 AiModel, AiModelVersion, TrainingDataset, TrainingJob 이름을 가져와 아래 로직에서 재사용한다.
from app.models.mlops_models import (
    AiModel,
    AiModelVersion,
    TrainingDataset,
    TrainingJob,
)

# 설명: `__all__`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.

# 모델 비교 분석 전용 Batch/Run 엔터티를 외부 모듈에서 재사용한다.
from app.models.report_model_comparison_models import (
    ReportModelComparisonBatch,
    ReportModelComparisonRun,
)

__all__ = [
    "User",
    "SignupRequest",
    "EmailVerification",
    "IdentityOAuthState",
    "SecurityLog",
    "IncidentReport",
    "ReportAttachment",
    "ReportAnalysisJob",
    "ReportLocation",
    "ReportMemo",
    "ReportStatusHistory",
    "Incident",
    "DetectionLog",
    "IncidentSnapshot",
    "IncidentStatusHistory",
    "IncidentMemo",
    "BoardPost",
    "BoardComment",
    "BoardAttachment",
    "BoardReaction",
    "BugReport",
    "BugReportAttachment",
    "ProjectResource",
    "ItsWeatherSnapshot",
    "ItsTrafficSnapshot",
    "ItsRiskScore",
    "ExternalApiLog",
    "ItsApiSource",
    "RiskContextSnapshot",
    "RiskCalculationLog",
    "Notification",
    "NotificationDelivery",
    "RealtimeEvent",
    "AiEvent",
    "ChatRoomMember",
    "ChatMessageRead",
    "ChatMessage",
    "ChatRoom",
    "Cctv",
    "CctvRoi",
    "CctvSlot",
    "CctvStatusLog",
    "AiModel",
    "AiModelVersion",
    "TrainingDataset",
    "TrainingJob",
    "ReportModelComparisonBatch",
    "ReportModelComparisonRun",
]
