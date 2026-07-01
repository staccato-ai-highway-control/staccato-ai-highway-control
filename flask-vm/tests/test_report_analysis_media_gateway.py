from copy import deepcopy

from app.modules.report_upload.service import ReportUploadService


PRIVATE_VIDEO_URL = "http://ai-media.invalid:5001/report-analysis/sample_annotated.mp4"
PRIVATE_IMAGE_URL = "http://ai-media.invalid:5001/report-analysis/sample_annotated.jpg"


def test_private_report_analysis_media_urls_use_gateway_paths():
    source = {
        "annotated_video_url": PRIVATE_VIDEO_URL,
        "annotated_image_url": PRIVATE_IMAGE_URL,
        "annotated_media": {
            "media_type": "video",
            "video_url": PRIVATE_VIDEO_URL,
            "image_url": PRIVATE_IMAGE_URL,
        },
    }

    result = ReportUploadService._browser_safe_analysis_media_response(
        source,
        242,
    )

    assert result["annotated_video_url"] == (
        "/api/ai-media/report-analysis/jobs/242/video"
    )
    assert result["annotated_image_url"] == (
        "/api/ai-media/report-analysis/jobs/242/snapshot"
    )
    assert result["annotated_media"]["video_url"] == (
        "/api/ai-media/report-analysis/jobs/242/video"
    )
    assert result["annotated_media"]["image_url"] == (
        "/api/ai-media/report-analysis/jobs/242/snapshot"
    )


def test_browser_safe_report_analysis_media_keeps_non_private_urls():
    source = {
        "annotated_video_url": "/storage/reports/annotated.mp4",
        "annotated_image_url": "/storage/reports/annotated.jpg",
        "annotated_media": {
            "video_url": "/storage/reports/annotated.mp4",
            "image_url": "/storage/reports/annotated.jpg",
        },
    }

    result = ReportUploadService._browser_safe_analysis_media_response(
        source,
        242,
    )

    assert result == source


def test_browser_safe_report_analysis_media_does_not_mutate_stored_result():
    source = {
        "annotated_video_url": PRIVATE_VIDEO_URL,
        "annotated_media": {
            "video_url": PRIVATE_VIDEO_URL,
        },
    }
    original = deepcopy(source)

    ReportUploadService._browser_safe_analysis_media_response(source, 242)

    assert source == original
