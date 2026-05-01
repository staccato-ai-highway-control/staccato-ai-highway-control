import json
import os
import urllib.error
import urllib.request


class AiClientError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AiClient:
    def __init__(self):
        self.base_url = os.getenv("AI_SERVER_URL", "http://ai-server:8001").rstrip("/")

    def analyze_upload(self, payload):
        url = f"{self.base_url}/detections/analyze-upload"

        request_body = json.dumps(payload).encode("utf-8")

        request = urllib.request.Request(
            url=url,
            data=request_body,
            headers={
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                response_body = response.read().decode("utf-8")
                return json.loads(response_body)

        except urllib.error.HTTPError as error:
            error_body = error.read().decode("utf-8")
            raise AiClientError(
                f"AI Server returned error: {error_body}",
                status_code=502,
            )

        except Exception as error:
            raise AiClientError(
                f"Failed to call AI Server: {str(error)}",
                status_code=502,
            )
