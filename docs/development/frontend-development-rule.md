# STACCATO 프론트엔드 개발 규칙

## 1. 기본 원칙

Frontend Server는 Next.js 기반으로 구현한다.

Frontend는 Flask Server만 호출한다.

금지:

- AI Server 직접 호출 금지
- ITS Server 직접 호출 금지
- DB 직접 접근 금지
- API Key를 Frontend 코드에 직접 포함 금지

---

## 2. 기준 구조

```text
frontend-server/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/
│   ├── dashboard/
│   ├── cctvs/
│   ├── incidents/
│   └── reports/
├── components/
│   ├── common/
│   ├── layout/
│   ├── auth/
│   ├── cctv/
│   ├── incident/
│   └── report/
├── features/
│   ├── auth/
│   ├── cctv/
│   ├── incident/
│   ├── notification/
│   └── report/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── socket.ts
├── types/
│   ├── auth.ts
│   ├── cctv.ts
│   ├── incident.ts
│   └── report.ts
├── public/
├── package.json
└── Dockerfile
```

---

## 3. 폴더별 역할

| 폴더 | 역할 |
|---|---|
| `app/` | Next.js 라우팅 페이지 |
| `components/` | 재사용 UI 컴포넌트 |
| `features/` | 기능 단위 화면/로직 |
| `lib/` | API client, auth helper, socket helper |
| `types/` | TypeScript 타입 |
| `public/` | 정적 파일 |

---

## 4. API 호출 규칙

모든 API 호출은 Flask Server를 대상으로 한다.

기준 환경변수:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

API 호출 코드는 가능하면 `frontend-server/lib/api.ts`에 모은다.

---

## 5. 작업 위치 규칙

조원이 만든 프론트 코드는 반드시 `frontend-server/` 내부에 위치해야 한다.

정상:

```text
frontend-server/app/
frontend-server/components/
frontend-server/package.json
```

금지:

```text
app/
components/
package.json
```

루트에 Frontend 파일을 만들면 안 된다.

---

## 6. 커밋 금지 파일

아래 파일과 폴더는 Git에 올리지 않는다.

```text
frontend-server/node_modules/
frontend-server/.next/
frontend-server/dist/
frontend-server/build/
frontend-server/.env
frontend-server/.env.local
```

---

## 7. 실행 방법

로컬 실행:

```powershell
cd frontend-server
npm install
npm run dev
```

Docker 실행:

```powershell
docker compose build frontend-server
docker compose up -d frontend-server
```

브라우저 확인:

```text
http://localhost:3000
```
