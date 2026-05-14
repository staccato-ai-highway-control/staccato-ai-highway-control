import os
import sys
from dotenv import load_dotenv

# 1. 경로 설정 및 .env 로드
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(base_dir)
load_dotenv(os.path.join(base_dir, '.env'))

from app import create_app
try:
    from app import db
except ImportError:
    from app.extensions import db 

from app.modules.incident.service import IncidentService

def test_incident_creation_console():
    app = create_app()
    
    with app.app_context():
        print("\n" + "="*50)
        print("🔍 [Unit Test] IncidentService 저장 테스트 시작")
        print("="*50)

        # 2. 에러 안 나게 'original_filename'까지 꽉 채운 데이터
        test_form = {
            "location": "수원 영통구 테스트 지점",
            "incident_type": "Pothole",
            "description": "유닛 테스트 중입니다."
        }
        
        # 서비스가 요구할 법한 파일 정보들을 다 때려 넣습니다.
        test_file = {
            "file_path": "/home/lsh/staccato-ai-highway-control/flask-vm/storage/test.jpg",
            "file_name": "test.jpg", # 이게 stored_filename과 같은 의미일 수 있지만
            "stored_filename": "test_12345.jpg", # 에러가 지목한 범인! 추가해줍니다.
            "original_filename": "pothole_photo.jpg",
            "mime_type": "image/jpeg"
        }
        
        user_id = 1

        try:
            print(f"[*] DB(190번)에 데이터 쏘는 중...")
            # 실제 서비스 함수 호출!
            result = IncidentService.create_incident(test_form, test_file, user_id)

            if result.get('status') == 'success':
                print(f"\n✅ [성공] 드디어 저장 완료!")
                print(f"   - 생성된 리포트 번호: {result.get('report_id')}")
            else:
                print(f"\n❌ [실패] 서비스 로직에서 거절당함: {result.get('error')}")

        except Exception as e:
            # 여기서 에러가 나면 터미널에 범인이 누군지 찍힙니다.
            print(f"\n🚨 [에러] 코드에 문제가 있음: {str(e)}")

        print("="*50)

if __name__ == "__main__":
    test_incident_creation_console()