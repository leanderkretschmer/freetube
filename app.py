from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

import requests
from flask import Flask, jsonify, request, send_from_directory
from yt_dlp import YoutubeDL

app = Flask(__name__, static_folder=".")


@lru_cache(maxsize=1)
def _yt_dl_opts() -> dict[str, Any]:
    return {
        "quiet": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "nocheckcertificate": True,
        "no_warnings": True,
        "cachedir": False,
    }


@app.route("/")
def index() -> Any:
    return send_from_directory(app.static_folder, "index.html")


@app.route("/app.js")
def js_bundle() -> Any:
    return send_from_directory(app.static_folder, "app.js")


@app.route("/styles.css")
def css_bundle() -> Any:
    return send_from_directory(app.static_folder, "styles.css")


@app.route("/api/search")
def search() -> Any:
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []})

    limit = min(int(request.args.get("limit", 12)), 30)
    search_url = f"ytsearch{limit}:{query}"

    with YoutubeDL(_yt_dl_opts()) as ydl:
        data = ydl.extract_info(search_url, download=False)

    entries = data.get("entries", []) if isinstance(data, dict) else []
    results = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        results.append(
            {
                "id": entry.get("id"),
                "title": entry.get("title"),
                "channel": entry.get("channel") or entry.get("uploader"),
                "thumbnail": entry.get("thumbnail"),
                "type": entry.get("_type", "video"),
            }
        )

    return jsonify({"results": results})


@app.route("/api/autocomplete")
def autocomplete() -> Any:
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"suggestions": []})

    response = requests.get(
        "https://suggestqueries.google.com/complete/search",
        params={"client": "firefox", "ds": "yt", "q": query},
        timeout=5,
    )
    response.raise_for_status()
    payload = response.json()
    suggestions = payload[1] if len(payload) > 1 else []
    return jsonify({"suggestions": suggestions})


@app.route("/api/video")
def video() -> Any:
    video_id = request.args.get("id", "").strip()
    if not video_id:
        return jsonify({"error": "missing id"}), 400

    with YoutubeDL({**_yt_dl_opts(), "extract_flat": False}) as ydl:
        info = ydl.extract_info(video_id, download=False)

    formats = []
    for fmt in info.get("formats", []):
        if fmt.get("vcodec") == "none" or fmt.get("acodec") == "none":
            continue
        formats.append(
            {
                "itag": fmt.get("format_id"),
                "height": fmt.get("height"),
                "fps": fmt.get("fps"),
                "ext": fmt.get("ext"),
                "url": fmt.get("url"),
                "format_note": fmt.get("format_note"),
                "filesize": fmt.get("filesize"),
            }
        )

    formats.sort(key=lambda item: item.get("height") or 0, reverse=True)

    return jsonify(
        {
            "id": info.get("id"),
            "title": info.get("title"),
            "channel": info.get("channel") or info.get("uploader"),
            "channel_url": info.get("channel_url"),
            "thumbnail": info.get("thumbnail"),
            "description": info.get("description"),
            "formats": formats,
        }
    )


@app.route("/api/health")
def health() -> Any:
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)
