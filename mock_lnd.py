#!/usr/bin/env python3
"""
Mock LND REST API para pruebas del bot BTC trader.
Genera certificado TLS autofirmado y responde endpoints básicos.
"""
import ssl
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
import os

# Generar certificado TLS autofirmado
cert_file = "/tmp/lnd_mock_cert.pem"
key_file = "/tmp/lnd_mock_key.pem"

if not os.path.exists(cert_file):
    import subprocess
    subprocess.run([
        "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-keyout", key_file, "-out", cert_file,
        "-days", "365", "-subj", "/CN=localhost"
    ], check=True)
    print(f"✅ Certificado generado: {cert_file}")

class LNDMockHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()

    def _json_response(self, data, status=200):
        self._set_headers(status)
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        if self.path == "/v1/getinfo":
            self._json_response({
                "identity_pubkey": "mock_pubkey_12345",
                "alias": "mock-lnd-node",
                "num_active_channels": 0,
                "num_peers": 0,
                "block_height": 1000,
                "version": "mock-lnd-0.8.2",
            })
        elif self.path == "/v1/balance/channels":
            self._json_response({
                "balance": "500000",
                "local_balance": {"sat": 500000, "msat": 500000000},
                "remote_balance": {"sat": 0, "msat": 0},
            })
        elif self.path.startswith("/v1/invoices"):
            self._json_response({
                "payment_request": "lnbcrt500000n1p...mock_invoice",
                "r_hash": "mock_hash_123",
            })
        else:
            self._json_response({"error": "Not found"}, 404)

    def do_POST(self):
        if self.path == "/v1/channels/transactions":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            self._json_response({
                "payment_hash": "mock_payment_hash",
                "payment_preimage": "mock_preimage",
                "payment_route": {"total_fees": "10"},
            })
        elif self.path.startswith("/v1/invoices"):
            self._json_response({
                "payment_request": "lnbcrt500000n1p...mock_invoice",
                "r_hash": "mock_hash_123",
            })
        else:
            self._json_response({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        pass  # Silenciar logs


if __name__ == "__main__":
    server_address = ("0.0.0.0", 8080)
    httpd = HTTPServer(server_address, LNDMockHandler)
    
    # Configurar SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"🚀 Mock LND corriendo en https://localhost:8080")
    print(f"   Cert: {cert_file}")
    print(f"   Endpoints: /v1/getinfo, /v1/balance/channels, /v1/channels/transactions")
    print(f"Presioná Ctrl+C para detener")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nMock LND detenido.")
