#!/usr/bin/env python3
"""Dev server with no-cache headers so browser always gets the latest files."""
import http.server, socketserver

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # silence request logs

PORT = 8080
with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'Frontend running at http://localhost:{PORT}')
    httpd.serve_forever()
