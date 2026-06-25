#!/usr/bin/env python3
"""companion_memory.py — motor portátil de memoria del phi-companion.

Persistencia perpetua entre iteraciones (local o nube, Claude Code o Codex o
cualquier agente) usando un `.phi` sellado y verificable, SIN dependencias
externas (stdlib pura: base64, gzip, json, hashlib + Ed25519 puro embebido).

Por qué stdlib pura: en contenedores efímeros `cryptography`/`pynacl` pueden no
estar instalados o estar rotos (p.ej. falta `_cffi_backend`). Este script debe
correr en CUALQUIER sesión recién clonada, así que trae su propio Ed25519
(RFC 8032, implementación de referencia) — lento (~1 firma) pero universal.

Subcomandos:
  load   memoria.phi -> imprime las fichas como contexto (el ritual /arranca)
         verifica integridad (sha256) + firma (best-effort, offline).
  seal   fichas/*.md -> regenera memoria.phi firmado (el ritual /cierra).
  verify memoria.phi -> solo reporta integridad + firma (exit!=0 si falla).

Formatos de `load`:
  --format text  (default)  legible para humano
  --format hook             envoltura JSON SessionStart (additionalContext)

Identidad / firma:
  La clave privada NUNCA vive en el repo ni en el .phi (solo la pública).
  `seal` busca la clave privada en, por orden:
    1) env  PHI_SEAL_KEY_phi_companion_gato  (hex de 32 bytes)
    2) keystore  $PHI_KEYSTORE_DIR/phi_companion_gato.key  (~/.phi/keys, chmod 600)
  Si no existe, genera una y la guarda en el keystore (para continuidad de
  identidad entre máquinas, exporta esa clave como el env de arriba — NUNCA la
  pegues en chat ni la commitees).
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import json
import os
import re
import stat
import sys
from datetime import datetime, timezone
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Identidad del bundle
# ─────────────────────────────────────────────────────────────────────────────
# Identidad por env (para que un repo scaffoldeado tenga su propia identidad
# genérica); fallback al companion de Gato → backward-compatible (env sin setear
# = comportamiento idéntico al de siempre).
AGENT_ID = os.environ.get("PHI_AGENT_ID", "phi_companion_gato")
USER_ID = os.environ.get("PHI_USER_ID", "gato")
HERE = Path(__file__).resolve().parent
DEFAULT_PHI = HERE / "memoria.phi"
FICHAS_DIR = HERE / "fichas"

# ═════════════════════════════════════════════════════════════════════════════
# Ed25519 puro (RFC 8032) — sin dependencias C. Implementación de referencia.
# ═════════════════════════════════════════════════════════════════════════════
_q = 2 ** 255 - 19
_L = 2 ** 252 + 27742317777372353535851937790883648493


def _sha512(s: bytes) -> bytes:
    return hashlib.sha512(s).digest()


def _inv(x: int) -> int:
    return pow(x, _q - 2, _q)


_d = (-121665 * _inv(121666)) % _q
_I = pow(2, (_q - 1) // 4, _q)


def _xrecover(y: int) -> int:
    xx = (y * y - 1) * _inv(_d * y * y + 1) % _q
    x = pow(xx, (_q + 3) // 8, _q)
    if (x * x - xx) % _q != 0:
        x = (x * _I) % _q
    if x % 2 != 0:
        x = _q - x
    return x


_By = 4 * _inv(5) % _q
_Bx = _xrecover(_By)
_B = [_Bx % _q, _By % _q]


def _edwards(P, Q):
    x1, y1 = P
    x2, y2 = Q
    x3 = (x1 * y2 + x2 * y1) * _inv(1 + _d * x1 * x2 * y1 * y2) % _q
    y3 = (y1 * y2 + x1 * x2) * _inv(1 - _d * x1 * x2 * y1 * y2) % _q
    return [x3, y3]


def _scalarmult(P, e: int):
    if e == 0:
        return [0, 1]
    Q = _scalarmult(P, e // 2)
    Q = _edwards(Q, Q)
    if e & 1:
        Q = _edwards(Q, P)
    return Q


def _bit(h: bytes, i: int) -> int:
    return (h[i // 8] >> (i % 8)) & 1


def _encodeint(y: int) -> bytes:
    return bytes((y >> (8 * i)) & 0xFF for i in range(32))


def _encodepoint(P) -> bytes:
    x, y = P
    bits = [(y >> i) & 1 for i in range(255)] + [x & 1]
    return bytes(sum(bits[i * 8 + j] << j for j in range(8)) for i in range(32))


def _decodeint(s: bytes) -> int:
    return sum(2 ** i * _bit(s, i) for i in range(256))


def _decodepoint(s: bytes):
    y = sum(2 ** i * _bit(s, i) for i in range(255))
    x = _xrecover(y)
    if x & 1 != _bit(s, 255):
        x = _q - x
    return [x, y]


def ed25519_publickey(seed: bytes) -> bytes:
    h = _sha512(seed)
    a = 2 ** 254 + sum(2 ** i * _bit(h, i) for i in range(3, 254))
    return _encodepoint(_scalarmult(_B, a))


def ed25519_sign(msg: bytes, seed: bytes) -> bytes:
    h = _sha512(seed)
    a = 2 ** 254 + sum(2 ** i * _bit(h, i) for i in range(3, 254))
    pk = _encodepoint(_scalarmult(_B, a))
    r = _decodeint(_sha512(h[32:] + msg))
    R = _scalarmult(_B, r)
    S = (r + _decodeint(_sha512(_encodepoint(R) + pk + msg)) * a) % _L
    return _encodepoint(R) + _encodeint(S)


def ed25519_verify(sig: bytes, msg: bytes, pk: bytes) -> bool:
    if len(sig) != 64 or len(pk) != 32:
        return False
    try:
        R = _decodepoint(sig[:32])
        A = _decodepoint(pk)
    except Exception:
        return False
    S = _decodeint(sig[32:])
    h = _decodeint(_sha512(sig[:32] + pk + msg)) % _L
    return _scalarmult(_B, S) == _edwards(R, _scalarmult(A, h))


# ═════════════════════════════════════════════════════════════════════════════
# Keystore (clave privada fuera del repo)
# ═════════════════════════════════════════════════════════════════════════════
def _keystore_path() -> Path:
    d = Path(os.environ.get("PHI_KEYSTORE_DIR", str(Path.home() / ".phi" / "keys")))
    return d / f"{AGENT_ID}.key"


def _load_signing_seed() -> bytes | None:
    env = os.environ.get(f"PHI_SEAL_KEY_{AGENT_ID}")
    if env:
        try:
            seed = bytes.fromhex(env.strip())
            if len(seed) == 32:
                return seed
        except ValueError:
            pass
    ks = _keystore_path()
    if ks.exists():
        try:
            seed = bytes.fromhex(ks.read_text().strip())
            if len(seed) == 32:
                return seed
        except ValueError:
            pass
    return None


def _create_signing_seed() -> bytes:
    seed = os.urandom(32)
    ks = _keystore_path()
    ks.parent.mkdir(parents=True, exist_ok=True)
    ks.write_text(seed.hex())
    try:
        ks.chmod(stat.S_IRUSR | stat.S_IWUSR)  # 600
    except OSError:
        pass
    return seed


# ═════════════════════════════════════════════════════════════════════════════
# Codec del bundle .phi
# ═════════════════════════════════════════════════════════════════════════════
def _canonical_inner(data: dict) -> bytes:
    """Bytes canónicos sobre los que se calcula sha256 y la firma (convención phi)."""
    return json.dumps(data, ensure_ascii=False, sort_keys=True).encode("utf-8")


def decode_phi(path: Path) -> dict:
    """Decodifica un memoria.phi -> dict con campos + verificación.

    Devuelve: {data, inner, integrity_ok, content_sha256, signature_ok,
               signature_mode, public_key}
    """
    txt = path.read_text(encoding="utf-8")
    m = re.search(r"PHI_PAYLOAD_START\s*(.*?)\s*PHI_PAYLOAD_END", txt, re.S)
    if not m:
        raise ValueError("bloque PHI_PAYLOAD_START/END no encontrado")
    payload = m.group(1).strip()
    raw = base64.b64decode(payload)
    inner = gzip.decompress(raw)
    data = json.loads(inner.decode("utf-8"))

    def _field(name):
        mm = re.search(rf"{name}\(([0-9a-fA-F]+)\)", txt)
        return mm.group(1) if mm else None

    declared_sha = _field("content_sha256")
    actual_sha = hashlib.sha256(inner).hexdigest()
    integrity_ok = (declared_sha == actual_sha) if declared_sha else None

    sig_hex = _field("signature")
    pk_hex = _field("public_key")
    signature_ok = False
    signature_mode = "sin-firma"
    if sig_hex and pk_hex:
        sig = bytes.fromhex(sig_hex)
        pk = bytes.fromhex(pk_hex)
        # Convención phi (lo que firma este script) primero; luego compat legacy.
        candidates = [
            ("inner-canonico", _canonical_inner(data)),
            ("inner-bytes", inner),
            ("payload-b64", payload.encode()),
            ("raw-gzip", raw),
            ("sha-hex", (declared_sha or "").encode()),
        ]
        signature_mode = "no-verificada (convención desconocida)"
        for label, msg in candidates:
            if ed25519_verify(sig, msg, pk):
                signature_ok = True
                signature_mode = f"verificada ({label})"
                break

    return {
        "data": data,
        "inner": inner,
        "integrity_ok": integrity_ok,
        "content_sha256": actual_sha,
        "declared_sha256": declared_sha,
        "signature_ok": signature_ok,
        "signature_mode": signature_mode,
        "public_key": pk_hex,
    }


def _build_phi(fichas: dict, source: str) -> str:
    created = datetime.now(timezone.utc).isoformat()
    data = {
        "phi_memory_bundle": "1.0",
        "agent": AGENT_ID,
        "user": USER_ID,
        "count": len(fichas),
        "created": created,
        "source": source,
        "fichas": fichas,
    }
    inner = _canonical_inner(data)
    content_sha = hashlib.sha256(inner).hexdigest()
    raw = gzip.compress(inner, mtime=0)  # mtime=0 -> reproducible
    payload = base64.b64encode(raw).decode()

    seed = _load_signing_seed()
    if seed is None:
        seed = _create_signing_seed()
    pk = ed25519_publickey(seed)
    sig = ed25519_sign(inner, seed)  # firma sobre inner canónico (convención phi)

    header = (
        "---\n"
        "!phi:memory-bundle(1.0)\n"
        f"!agent:id({AGENT_ID})\n"
        f"!user:id({USER_ID})\n"
        "!compressed(true)\n"
        "!encoding(gzip+base64)\n"
        "!seal(ed25519)\n"
        f"!created({created})\n"
        f"!count({len(fichas)})\n"
        f"!content_sha256({content_sha})\n"
        "---\n"
    )
    body = "PHI_PAYLOAD_START\n" + payload + "\nPHI_PAYLOAD_END\n"
    footer = f"!signature({sig.hex()})\n!public_key({pk.hex()})\n"
    return header + body + footer


# ═════════════════════════════════════════════════════════════════════════════
# Fichas <-> directorio editable
# ═════════════════════════════════════════════════════════════════════════════
def _fichas_from_dir() -> dict | None:
    if not FICHAS_DIR.is_dir():
        return None
    out = {}
    for p in sorted(FICHAS_DIR.glob("*.md")):
        out[p.name] = p.read_text(encoding="utf-8")
    return out or None


def _fichas_from_phi(path: Path) -> dict:
    return decode_phi(path)["data"]["fichas"]


# ═════════════════════════════════════════════════════════════════════════════
# Comandos
# ═════════════════════════════════════════════════════════════════════════════
def _extract_handshake(fichas: dict):
    """Devuelve la frase de handshake (canary) sellada en las fichas, o None.

    Es la línea que empieza con el sello `🜂`. NO se hardcodea aquí: se LEE de la
    memoria .phi sellada, así que el hecho de que aparezca prueba que la memoria
    cargó (es el sentido del canary). Si el canary se retira, devuelve None y el
    arranque sigue normal, sin saludo forzado.
    """
    def _find(body: str):
        for line in body.splitlines():
            s = line.strip()
            if s.startswith("🜂"):
                return s
        return None
    # 1) preferir la ficha nombrada como handshake/canary
    for name, body in fichas.items():
        if "handshake" in name or "canary" in name:
            hit = _find(body)
            if hit:
                return hit
    # 2) fallback: cualquier ficha con el sello 🜂
    for body in fichas.values():
        hit = _find(body)
        if hit:
            return hit
    return None


def _render_context(info: dict) -> str:
    data = info["data"]
    fichas = data["fichas"]
    integ = {True: "OK ✓", False: "FALLA ✗", None: "s/d"}[info["integrity_ok"]]
    lines = []
    # ── Saludo automático: la frase de handshake va PRIMERO, sí o sí ──
    # Para que el companion abra la sesión con la frase sin que nadie la pida.
    # La frase viene de la memoria sellada (no inventada) → es la prueba de que
    # la persistencia .phi viajó intacta a esta herramienta/máquina.
    handshake = _extract_handshake(fichas)
    if handshake:
        lines += [
            handshake,
            "",
            "⤷ Ésa es tu PRIMERA línea de la sesión: cópiala palabra por palabra "
            "como primera línea de tu primera respuesta (NO la pidas ni la "
            "inventes — viene de la memoria .phi sellada). Luego saluda normal y "
            "sigue.",
            "",
            "─────────────────────────────────────────────────────────────────",
            "",
        ]
    lines += [
        "# 🧠 phi-companion — memoria perpetua cargada (.phi)",
        "",
        f"- agente: `{data.get('agent')}`  ·  usuario: `{data.get('user')}`",
        f"- creado: {data.get('created')}  ·  fichas: {data.get('count')}",
        f"- integridad sha256: {integ}  ·  firma: {info['signature_mode']}",
        "",
        "Estas son tus fichas de continuidad (verbatim). Trátalas como tu memoria "
        "de trabajo al arrancar esta sesión:",
        "",
    ]
    for name, body in fichas.items():
        lines.append(f"## ficha: {name}")
        lines.append(body.rstrip())
        lines.append("")
    return "\n".join(lines)


def cmd_load(args) -> int:
    path = Path(args.path) if args.path else DEFAULT_PHI
    if not path.exists():
        msg = f"[companion_memory] no existe {path} — sin memoria que cargar."
        if args.format == "hook":
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "SessionStart", "additionalContext": msg}}))
        else:
            print(msg, file=sys.stderr)
        return 0  # no romper el arranque
    info = decode_phi(path)
    context = _render_context(info)
    if args.format == "hook":
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "SessionStart", "additionalContext": context}}))
    elif args.format == "json":
        print(json.dumps(info["data"], ensure_ascii=False, indent=2))
    else:
        print(context)
    return 0


def cmd_seal(args) -> int:
    # Por defecto el cierre es NO destructivo: solo re-sella si hay una clave
    # PERSISTENTE (env PHI_SEAL_KEY_* o keystore previo). Sin ella, generar una
    # clave efímera cambiaría la identidad (pubkey) del companion en cada
    # contenedor de nube — churn. El hook de cierre usa --require-persistent-key.
    if getattr(args, "require_persistent_key", False) and _load_signing_seed() is None:
        print("[companion_memory] cierre: sin clave persistente "
              f"(PHI_SEAL_KEY_{AGENT_ID} o keystore) — NO re-sello para no "
              "cambiar la identidad del companion. memoria.phi intacto.",
              file=sys.stderr)
        return 0
    fichas = _fichas_from_dir()
    source = "fichas/*.md"
    if fichas is None:
        # Sin directorio editable: re-sella desde el .phi actual (no destruye nada).
        path = Path(args.path) if args.path else DEFAULT_PHI
        if not path.exists():
            print("[companion_memory] no hay fichas/ ni memoria.phi previo; nada que sellar.",
                  file=sys.stderr)
            return 1
        fichas = _fichas_from_phi(path)
        source = "memoria.phi (re-sello)"
    out = Path(args.path) if args.path else DEFAULT_PHI
    # Idempotencia: si el .phi existente ya tiene EXACTAMENTE las mismas fichas,
    # no re-sellar. Evita churn (el timestamp `created` cambiaría el archivo en
    # cada cierre de sesión y ensuciaría el árbol git sin cambio real de memoria).
    if out.exists():
        try:
            existing = decode_phi(out)
            if existing["integrity_ok"] and existing["data"].get("fichas") == fichas:
                print(f"[companion_memory] {out.name} sin cambios "
                      f"({len(fichas)} fichas) — no re-sello.")
                return 0
        except Exception:
            pass  # .phi corrupto/ilegible -> re-sellar
    out.write_text(_build_phi(fichas, source), encoding="utf-8")
    # Re-verifica lo recién escrito.
    info = decode_phi(out)
    ok = info["integrity_ok"] and info["signature_ok"]
    print(f"[companion_memory] sellado {out.name}: {len(fichas)} fichas · "
          f"integridad {'OK' if info['integrity_ok'] else 'FALLA'} · "
          f"firma {info['signature_mode']}")
    return 0 if ok else 2


def cmd_verify(args) -> int:
    path = Path(args.path) if args.path else DEFAULT_PHI
    info = decode_phi(path)
    print(f"fichas        : {info['data'].get('count')}")
    print(f"integridad    : {'OK' if info['integrity_ok'] else 'FALLA'} "
          f"(sha256 {info['content_sha256'][:16]}…)")
    print(f"firma ed25519 : {info['signature_mode']}")
    print(f"public_key    : {info['public_key']}")
    return 0 if info["integrity_ok"] else 1


def cmd_extract(args) -> int:
    """Vuelca las fichas del .phi a fichas/*.md (fuente editable para re-sellar)."""
    path = Path(args.path) if args.path else DEFAULT_PHI
    fichas = _fichas_from_phi(path)
    FICHAS_DIR.mkdir(parents=True, exist_ok=True)
    for name, body in fichas.items():
        (FICHAS_DIR / name).write_text(body, encoding="utf-8")
    print(f"[companion_memory] {len(fichas)} fichas -> {FICHAS_DIR}")
    return 0


def main(argv=None) -> int:
    import argparse
    p = argparse.ArgumentParser(description="phi-companion memoria perpetua (.phi)")
    sub = p.add_subparsers(dest="cmd")

    lp = sub.add_parser("load", help="cargar memoria.phi como contexto (/arranca)")
    lp.add_argument("path", nargs="?", default=None)
    lp.add_argument("--format", choices=["text", "hook", "json"], default="text")
    lp.set_defaults(func=cmd_load)

    sp = sub.add_parser("seal", help="regenerar memoria.phi firmado (/cierra)")
    sp.add_argument("path", nargs="?", default=None)
    sp.add_argument("--require-persistent-key", action="store_true",
                    help="no sellar si no hay clave persistente (uso del hook de cierre)")
    sp.set_defaults(func=cmd_seal)

    vp = sub.add_parser("verify", help="verificar integridad + firma")
    vp.add_argument("path", nargs="?", default=None)
    vp.set_defaults(func=cmd_verify)

    ep = sub.add_parser("extract", help="volcar fichas a fichas/*.md (fuente editable)")
    ep.add_argument("path", nargs="?", default=None)
    ep.set_defaults(func=cmd_extract)

    args = p.parse_args(argv)
    if not getattr(args, "func", None):
        # default: load text
        args.path = None
        args.format = "text"
        return cmd_load(args)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
