from __future__ import annotations

import json
import mimetypes
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


ROOT = pathlib.Path(__file__).resolve().parents[1]
DIST_DIR = ROOT / "dist"

PORT = int(os.environ.get("PORT", "8787"))
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_BASE_URL = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com").rstrip("/")
GEMINI_API_VERSION = os.environ.get("GEMINI_API_VERSION", "v1beta").strip()


OUTLINE_SYSTEM_INSTRUCTION = """
You are an elite presentation architect and visual storytelling expert.

Each slide must have: 'title', 'content', 'visualDescription', and 'layout'.

Layout options:
- "center", "left", "right", "top", "bottom", "split-left", "split-right", "diagonal", "scattered"

Rules:
- NEVER use the same layout for consecutive slides.
- Separate each content point with a newline character (\\n). Do not use markdown bullets.
- Titles: max 8 words.
- Visual descriptions must be text-free (no words/letters/logos/watermarks).
""".strip()


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    data = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def _text_response(handler: BaseHTTPRequestHandler, status: int, text: str) -> None:
    data = (text or "").encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/plain; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def _read_json(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def _require_api_key() -> None:
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY on the server")


def _gemini_generate_content(model: str, body: dict) -> dict:
    _require_api_key()
    model_path = model if model.startswith(("models/", "tunedModels/")) else f"models/{model}"
    url = f"{GEMINI_BASE_URL}/{GEMINI_API_VERSION}/{model_path}:generateContent?key={urllib.parse.quote(GEMINI_API_KEY)}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:  # nosec - local dev server
        return json.loads(resp.read().decode("utf-8"))


def _extract_text(resp: dict) -> str:
    candidates = resp.get("candidates") or []
    if not candidates:
        return ""
    parts = (((candidates[0] or {}).get("content") or {}).get("parts")) or []
    chunks: list[str] = []
    for part in parts:
        t = part.get("text")
        if isinstance(t, str) and t:
            chunks.append(t)
    return "".join(chunks)


def _extract_inline_data_base64(resp: dict) -> str:
    candidates = resp.get("candidates") or []
    if not candidates:
        return ""
    parts = (((candidates[0] or {}).get("content") or {}).get("parts")) or []
    for part in parts:
        inline = part.get("inlineData") or {}
        data = inline.get("data")
        if isinstance(data, str) and data:
            return data
    return ""


class Handler(BaseHTTPRequestHandler):
    server_version = "slides-backend/0.1"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _send_cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")

    def do_POST(self) -> None:
        try:
            if self.path == "/api/outline-stream":
                payload = _read_json(self)
                topic = (payload.get("topic") or "").strip()
                attachments = payload.get("attachments") or []

                parts: list[dict] = []
                for f in attachments:
                    parts.append({"inlineData": {"mimeType": f.get("mimeType"), "data": f.get("data")}})
                parts.append(
                    {
                        "text": (
                            "Create a world-class, award-winning presentation deck for: "
                            f"{topic or 'the provided content'}.\n"
                            "Return ONLY valid JSON (no markdown) as an array of slides with "
                            "title, content, visualDescription, layout."
                        )
                    }
                )

                resp = _gemini_generate_content(
                    "gemini-2.5-pro",
                    {
                        "contents": [{"role": "user", "parts": parts}],
                        "systemInstruction": {"role": "user", "parts": [{"text": OUTLINE_SYSTEM_INSTRUCTION}]},
                        "generationConfig": {"responseMimeType": "application/json"},
                    },
                )
                _text_response(self, 200, _extract_text(resp))
                return

            if self.path == "/api/single-slide":
                payload = _read_json(self)
                presentation_topic = payload.get("presentationTopic") or ""
                slide_description = payload.get("slideDescription") or ""
                existing_slides = payload.get("existingSlides") or []
                insert_index = int(payload.get("insertIndex") or -1)

                context_outline = ""
                if isinstance(existing_slides, list) and existing_slides:
                    context_outline += "\nCurrent Presentation Outline:\n"
                    for i in range(0, len(existing_slides) + 1):
                        if i == insert_index:
                            context_outline += ">>> [INSERT NEW SLIDE HERE] <<<\n"
                        if i < len(existing_slides):
                            s = existing_slides[i] or {}
                            title = s.get("title") or ""
                            content = (s.get("content") or "").replace("\n", "; ")
                            context_outline += f"Slide {i+1}: {title} ({content[:120]}...)\n"

                prompt = (
                    f"Presentation Topic: {presentation_topic}\n"
                    f"{context_outline}\n"
                    f"New Slide Request: {slide_description}\n\n"
                    "Create a single, award-winning slide that fits naturally.\n"
                    "Return ONLY valid JSON (no markdown) with keys: title, content, visualDescription, layout."
                )

                resp = _gemini_generate_content(
                    "gemini-2.5-pro",
                    {
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "systemInstruction": {"role": "user", "parts": [{"text": OUTLINE_SYSTEM_INSTRUCTION}]},
                        "generationConfig": {"responseMimeType": "application/json"},
                    },
                )
                raw = _extract_text(resp).strip()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    _text_response(self, 500, "Model did not return valid JSON")
                    return
                _json_response(self, 200, data)
                return

            if self.path == "/api/slide-image":
                payload = _read_json(self)
                slide = payload.get("slide") or {}
                config = payload.get("config") or {}

                prompt = (
                    "Ultra-premium, award-winning presentation background image.\n\n"
                    f"Visual Concept: {slide.get('visualDescription') or ''}\n"
                    f"Thematic Context: {slide.get('title') or ''}\n\n"
                    "ABSOLUTE REQUIREMENTS:\n"
                    "- ZERO text, words, letters, numbers, or characters\n"
                    "- No watermarks, logos, or overlays\n"
                    "- Suitable as a backdrop for text overlay\n"
                )

                image_cfg: dict = {"aspectRatio": config.get("aspectRatio") or "16:9"}
                if config.get("imageSize"):
                    image_cfg["imageSize"] = config.get("imageSize")

                resp = _gemini_generate_content(
                    config.get("model") or "gemini-2.5-flash-image",
                    {
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"imageConfig": image_cfg},
                    },
                )
                _json_response(self, 200, {"data": _extract_inline_data_base64(resp)})
                return

            if self.path == "/api/themed-background":
                payload = _read_json(self)
                theme = payload.get("theme") or {}
                presentation_context = payload.get("presentationContext") or ""
                config = payload.get("config") or {}

                prompt = (
                    "Premium presentation background with consistent, cohesive visual theme.\n\n"
                    f"THEME: {theme.get('name') or ''}\n"
                    f"{theme.get('promptSnippet') or ''}\n\n"
                    f"PRESENTATION CONTEXT:\n{presentation_context or 'Professional presentation'}\n\n"
                    "ABSOLUTE REQUIREMENTS:\n"
                    "- ZERO text, words, letters, numbers, or characters\n"
                    "- No watermarks, logos, or overlays\n"
                    "- Must work across many slides\n"
                )

                image_cfg: dict = {"aspectRatio": config.get("aspectRatio") or "16:9"}
                if config.get("imageSize"):
                    image_cfg["imageSize"] = config.get("imageSize")

                resp = _gemini_generate_content(
                    config.get("model") or "gemini-2.5-flash-image",
                    {
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"imageConfig": image_cfg},
                    },
                )
                _json_response(self, 200, {"data": _extract_inline_data_base64(resp)})
                return

            if self.path == "/api/enhance-notes":
                payload = _read_json(self)
                notes = payload.get("notes") or ""
                mode = payload.get("mode") or "enhance"
                target_language = payload.get("targetLanguage")

                prompt = (
                    "Act as a professional presentation coach and speechwriter.\n"
                    "Improve the following speaker notes based on the requested mode.\n\n"
                    f'Original Notes: "{notes}"\n\n'
                    f"Mode: {mode}\n"
                    + (f"Target Language: {target_language}\n" if mode == "translate" and target_language else "")
                    + "\nReturn ONLY the improved notes text. Do not include explanations."
                )

                resp = _gemini_generate_content(
                    "gemini-2.5-pro",
                    {"contents": [{"role": "user", "parts": [{"text": prompt}]}]},
                )
                _json_response(self, 200, {"text": _extract_text(resp).strip()})
                return

            _text_response(self, 404, "Not found")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else ""
            _text_response(self, int(e.code or 500), body or "Upstream error")
        except Exception as e:  # noqa: BLE001
            _text_response(self, 500, str(e) or "Server error")

    def do_GET(self) -> None:
        if self.path.startswith("/api/"):
            _text_response(self, 405, "Method not allowed")
            return

        # Static file serving for built app (npm run build + npm run start)
        req_path = self.path.split("?", 1)[0]
        if req_path == "/":
            req_path = "/index.html"

        file_path = (DIST_DIR / req_path.lstrip("/")).resolve()
        try:
            if not str(file_path).startswith(str(DIST_DIR.resolve())):
                _text_response(self, 404, "Not found")
                return

            if not file_path.exists() or not file_path.is_file():
                index_path = DIST_DIR / "index.html"
                if index_path.exists():
                    data = index_path.read_bytes()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return
                _text_response(self, 404, "Not found")
                return

            data = file_path.read_bytes()
            ctype, _ = mimetypes.guess_type(str(file_path))
            self.send_response(200)
            self.send_header("Content-Type", ctype or "application/octet-stream")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception:  # noqa: BLE001
            _text_response(self, 500, "Server error")


def main() -> None:
    if not GEMINI_API_KEY:
        print("[backend] GEMINI_API_KEY is not set; AI endpoints will fail until it is.", file=sys.stderr)

    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[backend] listening on http://localhost:{PORT}", file=sys.stderr)
    server.serve_forever()


if __name__ == "__main__":
    main()
