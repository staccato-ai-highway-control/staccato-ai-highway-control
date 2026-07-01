"""Event media route authentication contract tests."""

import unittest

from fastapi import HTTPException
from fastapi.routing import APIRoute

from app import main as ai_main


TEST_INTERNAL_TOKEN = "test-event-media-internal-token"


def _route_for_path(path: str) -> APIRoute:
    matches = [
        route
        for route in ai_main.app.routes
        if isinstance(route, APIRoute) and route.path == path
    ]
    if len(matches) != 1:
        raise AssertionError(
            f"Expected exactly one route for {path!r}, found {len(matches)}."
        )
    return matches[0]


class EventMediaAuthTests(unittest.TestCase):
    def setUp(self):
        self.original_token = ai_main.INTERNAL_API_TOKEN
        ai_main.INTERNAL_API_TOKEN = TEST_INTERNAL_TOKEN

    def tearDown(self):
        ai_main.INTERNAL_API_TOKEN = self.original_token

    def test_event_media_routes_depend_on_internal_token(self):
        for path in (
            "/events/{event_id}.jpg",
            "/events/{event_id}.mp4",
        ):
            route = _route_for_path(path)
            dependency_calls = [
                dependency.call
                for dependency in route.dependant.dependencies
            ]
            self.assertIn(
                ai_main.require_internal_token,
                dependency_calls,
                f"{path} must require the internal API token.",
            )

    def test_internal_token_rejects_missing_and_accepts_valid_token(self):
        with self.assertRaises(HTTPException) as context:
            ai_main.require_internal_token("")

        self.assertEqual(context.exception.status_code, 403)

        result = ai_main.require_internal_token(
            f"Bearer {TEST_INTERNAL_TOKEN}"
        )
        self.assertIsNone(result)
