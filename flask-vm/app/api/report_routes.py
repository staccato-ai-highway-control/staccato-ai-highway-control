from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.report_service import ReportService
import logging

# 로깅 설정 (에러 추적용)
logger = logging.getLogger(__name__)

report_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@report_bp.route('', methods=['POST'])
@jwt_required()
def create_report():
    try:
        user_id = get_jwt_identity()
        
        # multipart/form-data에서 텍스트 데이터 추출
        data = request.form.to_dict()
        
        # 업로드된 파일 목록 추출 ('files'라는 이름으로 여러 개 보낼 때)
        files = request.files.getlist('files')
        
        if not files:
            return jsonify({"error": "파일이 업로드되지 않았습니다."}), 400

        # 서비스 로직 호출
        report = ReportService.create_report(user_id, data, files)

        return jsonify({
            "message": "리포트가 성공적으로 접수되었습니다.",
            "report_code": report.report_code,
            "report_id": report.id
        }), 201

    except Exception as e:
        logger.error(f"리포트 생성 중 오류 발생: {str(e)}")
        return jsonify({"error": "서버 내부 오류가 발생했습니다.", "details": str(e)}), 500