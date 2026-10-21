#!/usr/bin/env python3
"""Serve the local experience with the CORS headers required by Project 0."""
import argparse
import functools
import http.server
from pathlib import Path


class CorsHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5500)
    parser.add_argument("--directory", default=str(Path(__file__).resolve().parents[1] / "experience"))
    args = parser.parse_args()
    handler = functools.partial(CorsHandler, directory=args.directory)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Experience server: http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
