from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import subprocess
from queue import Empty, Full, Queue
from threading import Event, Lock, Thread
from typing import Any

import cv2
import numpy as np

from .config import (
    EVENT_CLIP_FPS,
    EVENT_CLIP_POST_SECONDS,
    EVENT_CLIP_PRE_SECONDS,
    EVENT_CLIP_WRITE_QUEUE_SIZE,
    EVENT_MEDIA_DIR,
    EVENT_SNAPSHOT_QUALITY,
    AI_VM_PUBLIC_BASE_URL,
)
from .overlay_renderer import render_event_overlay
from .relay_client import RelayClient
from .ring_buffer import FrameSnapshot, RingBuffer


VIDEO_CODEC_FALLBACKS = ("avc1", "H264", "mp4v")


@dataclass
class _ActiveClip:
    event: dict[str, Any]
    event_timestamp: datetime
    pre_frames: list[FrameSnapshot]
    post_seconds: float
    post_frames: list[FrameSnapshot] = field(default_factory=list)


@dataclass
class _ClipWriteJob:
    event: dict[str, Any]
    event_timestamp: datetime
    frames: list[FrameSnapshot]


class EventClipWorker:
    def __init__(
        self,
        camera_id: str,
        camera_name: str,
        ring_buffer: RingBuffer,
        output_fps: float | None = None,
        pre_seconds: float = EVENT_CLIP_PRE_SECONDS,
        post_seconds: float = EVENT_CLIP_POST_SECONDS,
    ) -> None:
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.ring_buffer = ring_buffer
        self.output_fps = output_fps or EVENT_CLIP_FPS
        self.pre_seconds = pre_seconds
        self.post_seconds = post_seconds
        self.relay_client = RelayClient()

        self._active_clips: list[_ActiveClip] = []
        self._active_lock = Lock()
        self._write_queue: Queue[_ClipWriteJob] = Queue(
            maxsize=max(1, EVENT_CLIP_WRITE_QUEUE_SIZE)
        )
        self._stop_event = Event()
        self._thread: Thread | None = None

        self.queued_clips = 0
        self.written_clips = 0
        self.failed_clips = 0
        self.sent_events = 0
        self.last_error: str | None = None

        self.snapshot_dir = EVENT_MEDIA_DIR / "snapshots"
        self.video_dir = EVENT_MEDIA_DIR / "videos"
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        self.video_dir.mkdir(parents=True, exist_ok=True)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = Thread(
            target=self._write_loop,
            name=f"EventClipWorker-{self.camera_id}",
            daemon=True,
        )
        self._thread.start()

    def stop(self, join_timeout: float = 3.0) -> None:
        self._stop_event.set()
        self._finalize_all_active()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=join_timeout)

    def enqueue_event(
        self,
        event: dict[str, Any],
        pre_seconds: float | None = None,
        post_seconds: float | None = None,
    ) -> None:
        event_timestamp = datetime.fromisoformat(str(event["timestamp"]))
        effective_post_seconds = post_seconds if post_seconds is not None else self.post_seconds
        buffered_frames = self.ring_buffer.snapshot(copy_frames=False)
        pre_frames = self._select_clip_frames(
            buffered_frames,
            event_timestamp,
            pre_seconds=pre_seconds,
            post_seconds=effective_post_seconds,
        )
        active_clip = _ActiveClip(
            event=dict(event),
            event_timestamp=event_timestamp,
            pre_frames=pre_frames,
            post_seconds=effective_post_seconds,
        )

        with self._active_lock:
            self._active_clips.append(active_clip)
            self.queued_clips += 1

        latest_buffered_timestamp = (
            buffered_frames[-1].timestamp if buffered_frames else event_timestamp
        )
        if (
            effective_post_seconds <= 0
            or (latest_buffered_timestamp - event_timestamp).total_seconds()
            >= effective_post_seconds
        ):
            self._finalize_ready_clips(latest_buffered_timestamp)

    def on_frame(self, frame: np.ndarray, timestamp: datetime) -> None:
        ready: list[_ActiveClip] = []
        snapshot = FrameSnapshot(timestamp=timestamp, frame=frame.copy())

        with self._active_lock:
            remaining: list[_ActiveClip] = []
            for clip in self._active_clips:
                elapsed = (timestamp - clip.event_timestamp).total_seconds()
                if timestamp >= clip.event_timestamp and elapsed <= clip.post_seconds:
                    clip.post_frames.append(snapshot)

                if elapsed >= clip.post_seconds:
                    ready.append(clip)
                else:
                    remaining.append(clip)

            self._active_clips = remaining

        for clip in ready:
            self._enqueue_write_job(clip)

    def to_status_payload(self) -> dict[str, Any]:
        with self._active_lock:
            active_count = len(self._active_clips)

        return {
            "active_clips": active_count,
            "queued_clips": self.queued_clips,
            "written_clips": self.written_clips,
            "failed_clips": self.failed_clips,
            "sent_events": self.sent_events,
            "write_queue_size": self._write_queue.qsize(),
            "media_dir": str(EVENT_MEDIA_DIR),
            "last_error": self.last_error,
            "relay": self.relay_client.to_status_payload(),
        }

    def _write_loop(self) -> None:
        while not self._stop_event.is_set() or not self._write_queue.empty():
            try:
                job = self._write_queue.get(timeout=0.2)
            except Empty:
                continue

            try:
                event = self._write_clip(job)
                if self.relay_client.send_event(event):
                    self.sent_events += 1
            except Exception as error:
                self.failed_clips += 1
                self.last_error = str(error)
                self.relay_client.send_event(job.event)

    def _write_clip(self, job: _ClipWriteJob) -> dict[str, Any]:
        frames = self._dedupe_frames(job.frames)
        if not frames:
            raise RuntimeError(f"No frames available for event {job.event['event_id']}")

        event = dict(job.event)
        event_id = self._safe_event_id(str(event["event_id"]))
        snapshot_path = self.snapshot_dir / f"{event_id}.jpg"
        video_path = self.video_dir / f"{event_id}.mp4"

        snapshot_frame = self._nearest_frame(frames, job.event_timestamp).frame
        rendered_snapshot = render_event_overlay(snapshot_frame, event)
        ok = cv2.imwrite(
            str(snapshot_path),
            rendered_snapshot,
            [int(cv2.IMWRITE_JPEG_QUALITY), EVENT_SNAPSHOT_QUALITY],
        )
        if not ok:
            raise RuntimeError(f"Failed to write snapshot {snapshot_path}")

        self._write_video(video_path, frames, event)

        base_url = AI_VM_PUBLIC_BASE_URL.rstrip("/")
        event["snapshot_url"] = f"{base_url}/events/{event_id}.jpg"
        event["video_url"] = f"{base_url}/events/{event_id}.mp4"
        self.written_clips += 1
        self.last_error = None
        return event

    def _write_video(
        self,
        video_path: Path,
        frames: list[FrameSnapshot],
        event: dict[str, Any],
    ) -> None:
        first_frame = frames[0].frame
        height, width = first_frame.shape[:2]
        width -= width % 2
        height -= height % 2

        raw_video_path = video_path.with_name(f"{video_path.stem}.raw{video_path.suffix}")
        h264_tmp_path = video_path.with_name(f"{video_path.stem}.h264.tmp{video_path.suffix}")

        for candidate in (raw_video_path, h264_tmp_path):
            if candidate.exists():
                candidate.unlink()

        writer = self._open_video_writer(raw_video_path, width, height)

        try:
            for snapshot in frames:
                frame = snapshot.frame
                if frame.shape[:2] != (height, width):
                    frame = cv2.resize(frame, (width, height))
                writer.write(render_event_overlay(frame, event))
        finally:
            writer.release()

        if not raw_video_path.exists() or raw_video_path.stat().st_size <= 0:
            raise RuntimeError(f"Failed to write raw video {raw_video_path}")

        self._transcode_to_browser_mp4(raw_video_path, h264_tmp_path)

        if not h264_tmp_path.exists() or h264_tmp_path.stat().st_size <= 0:
            raise RuntimeError(f"Failed to write H.264 video {h264_tmp_path}")

        h264_tmp_path.replace(video_path)
        raw_video_path.unlink(missing_ok=True)

    def _transcode_to_browser_mp4(self, input_path: Path, output_path: Path) -> None:
        command = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(input_path),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output_path),
        ]

        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if completed.returncode != 0:
            error_message = (completed.stderr or completed.stdout or "unknown ffmpeg error").strip()
            raise RuntimeError(f"Failed to transcode event clip to H.264: {error_message}")

    def _open_video_writer(self, video_path: Path, width: int, height: int) -> cv2.VideoWriter:
        for codec in VIDEO_CODEC_FALLBACKS:
            writer = cv2.VideoWriter(
                str(video_path),
                cv2.VideoWriter_fourcc(*codec),
                max(1.0, self.output_fps),
                (width, height),
            )
            if writer.isOpened():
                return writer

            writer.release()

        raise RuntimeError(f"Failed to open VideoWriter for {video_path}")

    def _select_clip_frames(
        self,
        frames: list[FrameSnapshot],
        event_timestamp: datetime,
        pre_seconds: float | None = None,
        post_seconds: float | None = None,
    ) -> list[FrameSnapshot]:
        effective_pre_seconds = pre_seconds if pre_seconds is not None else self.pre_seconds
        effective_post_seconds = post_seconds if post_seconds is not None else self.post_seconds
        return [
            frame
            for frame in frames
            if -effective_pre_seconds
            <= (frame.timestamp - event_timestamp).total_seconds()
            <= effective_post_seconds
        ]

    def _finalize_ready_clips(self, timestamp: datetime) -> None:
        ready: list[_ActiveClip] = []
        with self._active_lock:
            remaining: list[_ActiveClip] = []
            for clip in self._active_clips:
                elapsed = (timestamp - clip.event_timestamp).total_seconds()
                if elapsed >= clip.post_seconds:
                    ready.append(clip)
                else:
                    remaining.append(clip)
            self._active_clips = remaining

        for clip in ready:
            self._enqueue_write_job(clip)

    def _finalize_all_active(self) -> None:
        with self._active_lock:
            clips = self._active_clips
            self._active_clips = []

        for clip in clips:
            self._enqueue_write_job(clip)

    def _enqueue_write_job(self, clip: _ActiveClip) -> None:
        frames = clip.pre_frames + clip.post_frames
        try:
            self._write_queue.put_nowait(
                _ClipWriteJob(
                    event=clip.event,
                    event_timestamp=clip.event_timestamp,
                    frames=frames,
                )
            )
        except Full:
            self.failed_clips += 1
            self.last_error = "Event clip write queue is full; dropped clip job."

    @staticmethod
    def _dedupe_frames(frames: list[FrameSnapshot]) -> list[FrameSnapshot]:
        deduped: list[FrameSnapshot] = []
        seen: set[str] = set()
        for frame in sorted(frames, key=lambda item: item.timestamp):
            key = frame.timestamp.isoformat()
            if key in seen:
                continue
            deduped.append(frame)
            seen.add(key)
        return deduped

    @staticmethod
    def _nearest_frame(
        frames: list[FrameSnapshot],
        timestamp: datetime,
    ) -> FrameSnapshot:
        return min(
            frames,
            key=lambda item: abs((item.timestamp - timestamp).total_seconds()),
        )

    @staticmethod
    def _safe_event_id(event_id: str) -> str:
        return "".join(
            char for char in event_id if char.isalnum() or char in {"_", "-"}
        )
