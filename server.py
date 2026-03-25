import json
import os
import socket
from http.server import SimpleHTTPRequestHandler, HTTPServer

DATA_FILE = 'data.json'

class RequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/data':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if not content.strip():
                        content = '[]'
                    self.wfile.write(content.encode('utf-8'))
            else:
                self.wfile.write(b'[]')
        else:
            # serve static files
            return super().do_GET()

    def do_POST(self):
        if self.path == '/api/data':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            with open(DATA_FILE, 'wb') as f:
                f.write(post_data)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"success"}')
        else:
            self.send_response(404)
            self.end_headers()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    port = 8080
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, RequestHandler)
    
    local_ip = get_local_ip()
    print(f"\n" + "="*50)
    print(f"[*] SERVER RUNNING!")
    print(f"="*50)
    print(f"To use on this computer, visit:")
    print(f"   http://localhost:{port}")
    print(f"\nTo use on ANOTHER device (phone, tablet, etc), visit:")
    print(f"   http://{local_ip}:{port}")
    print(f"="*50 + "\n")
    
    httpd.serve_forever()
