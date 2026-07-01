from copy import deepcopy
from types import SimpleNamespace

from app.modules.ai_media.service import has_model_comparison_media_access
from app.modules.report_model_comparison.service import (
    ReportModelComparisonService,
)


class FakeRun:
    def __init__(self, run_id, annotated_media_url, result_summary):
        self.id = run_id
        self.run_status = "COMPLETED"
        self.annotated_media_url = annotated_media_url
        self.result_summary = result_summary

    def to_dict(self):
        return {
            "id": self.id,
            "run_status": self.run_status,
            "annotated_media_url": self.annotated_media_url,
            "result_summary": deepcopy(self.result_summary),
        }


def test_private_video_urls_use_comparison_gateway_without_mutating_source():
    raw_url = "http://ai-vm.internal:5001/media/comparison-video.mp4"
    source_summary = {
        "annotated_video_url": raw_url,
        "annotated_media_url": raw_url,
        "annotated_media": {"video_url": raw_url},
    }
    run = FakeRun(130, raw_url, source_summary)

    result = ReportModelComparisonService._serialize_run(run)
    expected = "/api/ai-media/report-model-comparisons/runs/130/video"

    assert result["annotated_media_url"] == expected
    assert result["result_summary"]["annotated_video_url"] == expected
    assert result["result_summary"]["annotated_media_url"] == expected
    assert result["result_summary"]["annotated_media"]["video_url"] == expected
    assert source_summary["annotated_video_url"] == raw_url
    assert source_summary["annotated_media"]["video_url"] == raw_url


def test_private_image_urls_use_comparison_snapshot_gateway():
    raw_url = "http://ai-vm.internal:5001/media/comparison-image.jpg"
    run = FakeRun(
        131,
        raw_url,
        {
            "annotated_image_url": raw_url,
            "annotated_media": {"image_url": raw_url},
        },
    )

    result = ReportModelComparisonService._serialize_run(run)
    expected = "/api/ai-media/report-model-comparisons/runs/131/snapshot"

    assert result["annotated_media_url"] == expected
    assert result["result_summary"]["annotated_image_url"] == expected
    assert result["result_summary"]["annotated_media"]["image_url"] == expected


def test_safe_media_url_is_preserved():
    safe_url = "/media/model-comparison/result.mp4"
    run = FakeRun(132, safe_url, {"annotated_video_url": safe_url})

    result = ReportModelComparisonService._serialize_run(run)

    assert result["annotated_media_url"] == safe_url
    assert result["result_summary"]["annotated_video_url"] == safe_url


def test_model_comparison_media_keeps_comparison_admin_policy():
    assert has_model_comparison_media_access(
        SimpleNamespace(role="SUPER_ADMIN")
    )
    assert has_model_comparison_media_access(
        SimpleNamespace(role="CONTROL_ADMIN")
    )
    assert not has_model_comparison_media_access(
        SimpleNamespace(role="ADMIN")
    )
