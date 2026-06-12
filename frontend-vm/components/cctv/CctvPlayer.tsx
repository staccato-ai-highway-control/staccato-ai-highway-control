/**
 * 파일 역할: CCTV 영역에서 사용하는 CctvPlayer UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { Cctv } from "@/features/cctvs/types";

// 코드 설명: CctvPlayer 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function CctvPlayer({ cctv }: { cctv: Cctv }) {
  // 코드 설명: mediaUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const mediaUrl = cctv.streamUrl || cctv.imageUrl;

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="relative h-[520px] overflow-hidden rounded-xl bg-slate-900">
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={`${cctv.cctvCode ?? cctv.id} stream`}
          className="absolute inset-0 h-full w-full object-contain"
          onError={(event) => {
            // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.currentTarget.style.display = "none";
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}
