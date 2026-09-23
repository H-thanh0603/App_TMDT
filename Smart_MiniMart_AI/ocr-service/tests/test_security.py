"""Smoke tests tối thiểu cho guard bảo mật của OCR service (chạy: python3 -m pytest tests -q)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.security import is_public_http_url  # noqa: E402


def test_blocks_private_and_local_hosts():
    for bad in [
        "http://localhost:5001/x.png",
        "http://127.0.0.1/x.png",
        "http://10.0.0.5/x.png",
        "http://192.168.1.1/x.png",
        "http://172.16.0.2/x.png",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/x.png",
        "http://[fd00::1]/x.png",
        "file:///etc/passwd",
        "ftp://example.com/x.png",
        "not-a-url",
        "",
    ]:
        assert not is_public_http_url(bad), bad


def test_blocks_cloud_metadata_even_behind_cname_or_dns(monkeypatch):
    import socket

    monkeypatch.setattr(
        socket, "getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("169.254.169.254", 0))]
    )
    assert not is_public_http_url("http://attacker.example/x.png")


def test_allows_real_public_hosts(monkeypatch):
    import socket

    monkeypatch.setattr(
        socket, "getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("1.1.1.1", 0))]
    )
    assert is_public_http_url("https://cdn.minimart.vn/uploads/r1.jpg")
