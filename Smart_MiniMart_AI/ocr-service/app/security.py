"""Utilities an toàn mạng cho OCR service (SSRF + giới hạn tải file)."""
import ipaddress
import logging
import socket
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


def is_public_http_url(raw: str) -> bool:
    """True nếu URL là http/https và hostname resolve ra địa chỉ công khai.

    Chặn: mọi scheme ngoài http/https, hostname rỗng/localhost, IP private,
    loopback, link-local, multicast, CGNAT, IPv6 ULA + DNS resolve về IP nội bộ.
    Lưu ý: không chống tuyệt đối DNS-rebinding trong mọi trường hợp đua,
    nhưng vẫn dùng trong main.py kết hợp resolve-then-fetch một lần.
    """
    try:
        parsed = urlparse(raw or "")
    except Exception:
        return False
    if parsed.scheme.lower() not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    if not host:
        return False
    if host in ("localhost", "::1") or host.endswith((".local", ".internal")):
        return False
    try:
        infos = socket.getaddrinfo(host, None)
    except (socket.gaierror, UnicodeError):
        return False
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    return True
