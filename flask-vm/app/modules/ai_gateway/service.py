# app/modules/ai_gateway/service.py

class AIGatewayService:
    @staticmethod
    def request_analysis(report_id, file_path):
        """
        AI 서버가 준비될 때까지 가짜로 성공을 반환하는 Mock 함수
        """
        # [임시] AI 서버가 아직 구축 중이므로 로그만 남기고 성공 처리
        print(f"\n[🚧 AI-Gateway Mock] Report {report_id} 분석 요청 수신됨")
        print(f"[🚧 AI-Gateway Mock] 대상 파일: {file_path}")
        print(f"[🚧 AI-Gateway Mock] 현재 AI 서버 구축 중으로, 실제 요청은 건너뜁니다.")
        
        # 나중에 서버 완공되면 아래 주석을 해제하세요!
        # ai_url = f"{current_app.config.get('AI_SERVER_URL')}/analyze"
        # response = requests.post(ai_url, json=payload, timeout=10)
        
        return True, {"status": "mock_success", "message": "AI server is under construction"}