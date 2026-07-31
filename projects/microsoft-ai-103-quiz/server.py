#!/usr/bin/env python3
"""
Microsoft AI-103 Exam Quiz & Training Center - Zero-Dependency Python REST API Server
Uses Python Standard Library (http.server, json, os, urllib)
Default Port: 6321
"""

import os
import sys
import json
import time
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
STATIC_DIR = os.path.join(ROOT_DIR, "static")
IMAGES_DIR = os.path.join(ROOT_DIR, "output", "microsoft-ai-103", "images")
OZET_DIR = os.path.join(ROOT_DIR, "egitim-ozet")

QUIZ_DATA_PATH = os.path.join(DATA_DIR, "quiz_data.json")
PROGRESS_PATH = os.path.join(DATA_DIR, "progress.json")

def ensure_data_files():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
            json.dump({"state": {}, "activeTopic": "All", "lastActiveIndex": 0, "activeModule": "quiz"}, f, indent=2, ensure_ascii=False)

ensure_data_files()


def is_safe_path(base_dir, requested_path):
    """Prevent path traversal attacks by ensuring resolved path is within base_dir."""
    real_base = os.path.realpath(base_dir)
    real_path = os.path.realpath(requested_path)
    return real_path.startswith(real_base + os.sep) or real_path == real_base


class QuizRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Custom request logging with timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sys.stderr.write(f"[{timestamp}] {self.address_string()} - {format % args}\n")

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def serve_file(self, file_path, content_type=None):
        if not os.path.isfile(file_path):
            self.send_error(404, f"File Not Found: {os.path.basename(file_path)}")
            return

        if not content_type:
            if file_path.endswith(".html"): content_type = "text/html; charset=utf-8"
            elif file_path.endswith(".css"): content_type = "text/css; charset=utf-8"
            elif file_path.endswith(".js"): content_type = "application/javascript; charset=utf-8"
            elif file_path.endswith(".json"): content_type = "application/json; charset=utf-8"
            elif file_path.endswith(".png"): content_type = "image/png"
            elif file_path.endswith(".jpg") or file_path.endswith(".jpeg"): content_type = "image/jpeg"
            elif file_path.endswith(".gif"): content_type = "image/gif"
            elif file_path.endswith(".svg"): content_type = "image/svg+xml"
            elif file_path.endswith(".ico"): content_type = "image/x-icon"
            elif file_path.endswith(".woff2"): content_type = "font/woff2"
            elif file_path.endswith(".woff"): content_type = "font/woff"
            else: content_type = "application/octet-stream"

        with open(file_path, "rb") as f:
            content = f.read()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        # Cache static assets for 1 hour
        if not file_path.endswith(".html"):
            self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path_str = parsed_url.path

        # --- Main App ---
        if path_str == "/" or path_str == "/index.html":
            self.serve_file(os.path.join(STATIC_DIR, "index.html"))

        # --- Ozet / Training Center ---
        elif path_str == "/ozet" or path_str == "/ozet/":
            self.serve_file(os.path.join(OZET_DIR, "egitim-merkezi.html"))

        elif path_str.startswith("/egitim-ozet/"):
            rel_path = path_str[len("/egitim-ozet/"):]
            if not rel_path:
                rel_path = "egitim-merkezi.html"
            target = os.path.join(OZET_DIR, rel_path)
            # Path traversal protection
            if not is_safe_path(OZET_DIR, target):
                self.send_error(403, "Forbidden")
                return
            self.serve_file(target)

        # --- Static files (CSS, JS) ---
        elif path_str.startswith("/static/"):
            rel_path = path_str[len("/static/"):]
            target = os.path.join(STATIC_DIR, rel_path)
            if not is_safe_path(STATIC_DIR, target):
                self.send_error(403, "Forbidden")
                return
            self.serve_file(target)

        # --- Images ---
        elif path_str.startswith("/images/"):
            rel_path = path_str[len("/images/"):]
            img_path = os.path.join(IMAGES_DIR, rel_path)
            if not is_safe_path(IMAGES_DIR, img_path):
                self.send_error(403, "Forbidden")
                return
            if not os.path.exists(img_path):
                img_path = os.path.join(DATA_DIR, "images", rel_path)
                if not is_safe_path(DATA_DIR, img_path):
                    self.send_error(403, "Forbidden")
                    return
            self.serve_file(img_path)

        # --- API: Quiz Data ---
        elif path_str == "/api/data":
            if not os.path.exists(QUIZ_DATA_PATH):
                self.send_json({"error": "quiz_data.json not found"}, 404)
                return
            with open(QUIZ_DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.send_json(data)

        # --- API: Progress ---
        elif path_str == "/api/progress":
            ensure_data_files()
            with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
                prog = json.load(f)
            self.send_json(prog)

        # --- API: Health Check ---
        elif path_str == "/api/health":
            self.send_json({
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "questions_loaded": os.path.exists(QUIZ_DATA_PATH)
            })

        # --- Favicon ---
        elif path_str == "/favicon.ico":
            self.send_response(204)
            self.end_headers()

        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path_str = parsed_url.path

        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            payload = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            payload = {}

        if path_str == "/api/progress":
            ensure_data_files()
            try:
                with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
                    current = json.load(f)
            except Exception:
                current = {"state": {}, "activeTopic": "All", "lastActiveIndex": 0, "activeModule": "quiz"}

            if "state" in payload: current["state"] = payload["state"]
            if "activeTopic" in payload: current["activeTopic"] = payload["activeTopic"]
            if "lastActiveIndex" in payload: current["lastActiveIndex"] = payload["lastActiveIndex"]
            if "activeModule" in payload: current["activeModule"] = payload["activeModule"]

            with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
                json.dump(current, f, indent=2, ensure_ascii=False)

            self.send_json({"status": "success", "progress": current})
        elif path_str == "/api/reset":
            ensure_data_files()
            default_prog = {"state": {}, "activeTopic": "All", "lastActiveIndex": 0, "activeModule": "quiz"}
            with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
                json.dump(default_prog, f, indent=2, ensure_ascii=False)
            self.send_json({"status": "reset", "progress": default_prog})
        else:
            self.send_error(404, "Endpoint Not Found")

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def run_server():
    port = int(os.environ.get("PORT", 6321))
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, QuizRequestHandler)
    print(f"🚀 Microsoft AI-103 Server & Training Center running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
