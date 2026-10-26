"""
JWT signature verification: algorithm selection and fail-closed behaviour.

This project signs Supabase access tokens with **ES256** -- its JWKS at
`{SUPABASE_URL}/auth/v1/.well-known/jwks.json` publishes a single EC P-256 key
declared `"alg": "ES256"`. A verifier hard-coded to `algorithms=["RS256"]`
therefore rejects every real token with "The specified alg value is not allowed",
which is exactly the failure these tests exist to prevent regressing.

The tests mint tokens against a LOCAL JWKS stub so they are hermetic and need no
Supabase credentials. The production code path is the same one: resolve the key
by `kid`, then derive the permitted algorithm from the KEY rather than from the
token's own `alg` header.

The load-bearing security properties:

  * the algorithm is chosen from the trusted JWKS key, not from the token header;
  * a token whose `alg` header disagrees with the key is rejected;
  * HS*/`none` are never accepted on the public-key path (the JWT confusion
    attack: sign with the *public* key as an HMAC secret and a naive verifier
    accepts it);
  * `exp`, `iss`, `aud` and `sub` are all still enforced.
"""
from __future__ import annotations

import http.client
import json
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from fastapi import HTTPException

from app.core import auth as auth_mod
from app.core.auth import (
    SUPPORTED_ALGORITHMS,
    get_current_user_id,
    verify_hs256_token,
)

SECRET_KID = "test-es256-key"
HS256_SECRET = "a-shared-secret-used-only-in-tests"


# ---------------------------------------------------------------------------
# Local JWKS stub
# ---------------------------------------------------------------------------

def _jwk_for(private_key, kid: str, alg: str) -> dict:
    """Serialize a public key as a JWK, dispatching on key type."""
    if isinstance(private_key, ec.EllipticCurvePrivateKey):
        jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(private_key))
    else:
        jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key))
    jwk.update({"kid": kid, "alg": alg, "use": "sig"})
    return jwk


class _StubJWKS:
    """Serves a fixed JWKS document on 127.0.0.1, as Supabase's endpoint does."""

    def __init__(self, keys: list[dict]) -> None:
        payload = json.dumps({"keys": keys}).encode()
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, *args):  # silence the test output
                pass

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}/jwks.json"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *exc):
        self.server.shutdown()
        self.server.server_close()


def _install_jwks(monkeypatch, keys: list[dict]):
    """Point the module at a stub JWKS and drop the cached real client."""
    stub = _StubJWKS(keys)
    stub.__enter__()
    monkeypatch.setattr(auth_mod, "jwks_client", jwt.PyJWKClient(stub.url))
    return stub


@pytest.fixture
def es256_project(monkeypatch):
    """A project that signs with ES256, the algorithm this project actually uses."""
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(auth_mod.settings, "supabase_url", "https://proj.supabase.co", raising=False)
    stub = _install_jwks(monkeypatch, [_jwk_for(key, SECRET_KID, "ES256")])
    yield key
    stub.__exit__()


@pytest.fixture
def es256_rejecting(monkeypatch):
    """A project whose JWKS is empty: simulates legacy HS256 / no public keys."""
    monkeypatch.setattr(auth_mod.settings, "supabase_url", "https://proj.supabase.co", raising=False)
    monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", "", raising=False)
    stub = _StubJWKS([])
    stub.__enter__()
    monkeypatch.setattr(auth_mod, "jwks_client", None)
    monkeypatch.setattr(auth_mod, "get_jwks_client", _empty_jwks_client)
    yield
    stub.__exit__()


async def _empty_jwks_client():
    """`PyJWKClient` whose JWKS document advertises no signing keys."""
    raise jwt.PyJWKClientError("The JWKS endpoint did not contain any signing keys")


class _FakeRequest:
    def __init__(self) -> None:
        self.state = type("State", (), {})()


def _claims(**over) -> dict:
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "role": "authenticated",
        "email": "creator@example.com",
        "iss": "https://proj.supabase.co/auth/v1",
        "exp": int(time.time()) + 600,
        "iat": int(time.time()),
    }
    payload.update(over)
    return payload


def _token(key, alg: str = "ES256", kid: str = SECRET_KID, **over) -> str:
    return jwt.encode(_claims(**over), key, algorithm=alg, headers={"kid": kid})


async def _verify(token: str) -> str:
    creds = auth_mod.HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return await get_current_user_id(_FakeRequest(), creds)


# ---------------------------------------------------------------------------


class TestConfiguredAlgorithm:
    async def test_es256_token_is_accepted(self, es256_project):
        """The regression this file exists for: the project's real algorithm."""
        token = _token(es256_project, "ES256")
        assert await _verify(token) == jwt.decode(
            token, options={"verify_signature": False}
        )["sub"]

    async def test_algorithm_comes_from_the_key_not_the_header(self, es256_project):
        """`alg` is read off the JWKS key; the header cannot choose it."""
        import base64

        def b64(obj):
            return base64.urlsafe_b64encode(
                json.dumps(obj).encode()).rstrip(b"=").decode()

        # Correctly signed by the project key, but the header claims HS256.
        # A verifier that trusted the header would try to use the PUBLIC key as
        # an HMAC secret and accept an attacker-forged token, so this must fail.
        token = _token(es256_project, "ES256")
        _, payload, sig = token.split(".")
        forged = f"{b64({'alg': 'HS256', 'typ': 'JWT', 'kid': SECRET_KID})}.{payload}.{sig}"
        with pytest.raises(HTTPException) as ctx:
            await _verify(forged)
        assert ctx.value.status_code == 401
        assert ctx.value.headers.get("WWW-Authenticate") == "Bearer"

    async def test_jwt_confusion_attack_using_the_public_key_is_rejected(
        self, es256_project
    ):
        """The classic attack: HMAC-sign with the *public* key as the secret.

        JWKS publishes the public key, so anyone can fetch it. If this verifier
        ever accepted HS256 on the public-key path, an attacker could mint a
        token for any `sub` and it would verify.

        PyJWT itself refuses to *mint* this token, so it is assembled by hand
        here -- which is exactly what an attacker using any other JWT library
        would submit to us.
        """
        import base64
        import hashlib
        import hmac

        pem = es256_project.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )

        def b64(raw: bytes) -> str:
            return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

        header = b64(json.dumps(
            {"alg": "HS256", "typ": "JWT", "kid": SECRET_KID}).encode())
        payload = b64(json.dumps(_claims(sub=str(uuid.uuid4()))).encode())
        signing_input = f"{header}.{payload}".encode()
        signature = b64(hmac.new(pem, signing_input, hashlib.sha256).digest())
        forged = f"{header}.{payload}.{signature}"

        with pytest.raises(HTTPException) as ctx:
            await _verify(forged)
        assert ctx.value.status_code == 401

    async def test_rs256_alg_is_not_accepted_for_an_es256_project(self, es256_project):
        """An RS256-labelled token cannot be verified with the EC key."""
        rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        token = _token(rsa_key, "RS256")
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401

    async def test_symmetric_algorithms_absent_from_allow_list(self):
        """HS* and `none` must never be permitted on the public-key path."""
        for alg in ("HS256", "HS384", "HS512", "none"):
            assert alg not in SUPPORTED_ALGORITHMS
        assert "RS256" in SUPPORTED_ALGORITHMS and "ES256" in SUPPORTED_ALGORITHMS


class TestInvalidSignatures:
    async def test_token_signed_by_a_different_key_is_rejected(self, es256_project):
        attacker_key = ec.generate_private_key(ec.SECP256R1())
        token = _token(attacker_key, "ES256")  # same kid, wrong private key
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401

    async def test_unknown_kid_is_rejected(self, es256_project):
        token = _token(es256_project, "ES256", kid="not-a-real-kid")
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401

    async def test_garbage_is_rejected(self, es256_project):
        with pytest.raises(HTTPException) as ctx:
            await _verify("not-a-jwt")
        assert ctx.value.status_code == 401

    async def test_missing_token_is_401(self, es256_project):
        from fastapi.security import HTTPAuthorizationCredentials  # noqa: F401

        with pytest.raises(HTTPException) as ctx:
            await get_current_user_id(_FakeRequest(), None)
        assert ctx.value.status_code == 401
        assert ctx.value.headers.get("WWW-Authenticate") == "Bearer"


class TestClaimsStillEnforced:
    async def test_expired_token_is_rejected(self, es256_project):
        token = _token(es256_project, exp=int(time.time()) - 5)
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401
        assert "expired" in ctx.value.detail.lower()

    async def test_missing_sub_is_rejected(self, es256_project):
        token = _token(es256_project, sub=None)
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401
        assert "sub" in ctx.value.detail.lower()

    async def test_wrong_audience_is_rejected(self, es256_project):
        token = _token(es256_project, aud="anon")
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401

    async def test_wrong_issuer_is_rejected(self, es256_project):
        token = _token(es256_project, iss="https://evil.example.com/auth/v1")
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401

    async def test_missing_exp_is_rejected(self, es256_project):
        payload = _claims()
        payload.pop("exp")
        token = jwt.encode(payload, es256_project, algorithm="ES256",
                           headers={"kid": SECRET_KID})
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401


class TestJwksUnavailable:
    """A JWKS that cannot be reached is infrastructure, not a bad token.

    PyJWT wraps only URLError/TimeoutError, so a dropped connection escapes its
    `fetch_data` entirely. Before this was handled it surfaced as an unhandled
    500. It must also never be mistaken for "this project is on legacy HS256"
    and sent down the symmetric path.
    """

    @pytest.mark.parametrize(
        "failure",
        [
            http.client.RemoteDisconnected("peer closed connection"),
            ConnectionResetError("reset by peer"),
            TimeoutError("timed out"),
            jwt.PyJWKClientConnectionError("Fail to fetch data from the url"),
        ],
        ids=["remote-disconnected", "connection-reset", "timeout", "pyjwt-connection-error"],
    )
    async def test_transport_failure_is_401_not_500(self, monkeypatch, failure):
        monkeypatch.setattr(auth_mod.settings, "supabase_url", "https://proj.supabase.co",
                            raising=False)

        class BrokenClient:
            def get_signing_key_from_jwt(self, token):
                raise failure

        monkeypatch.setattr(auth_mod, "jwks_client", BrokenClient())
        monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", HS256_SECRET,
                            raising=False)  # must still not be used

        with pytest.raises(HTTPException) as ctx:
            await _verify(_claims() and jwt.encode(_claims(), HS256_SECRET, algorithm="HS256"))
        assert ctx.value.status_code == 401
        assert "unavailable" in ctx.value.detail.lower()

    async def test_transport_failure_does_not_fall_back_to_hs256(self, monkeypatch):
        """A network blip must not send an ES256 project down the symmetric path.

        `PyJWKClientConnectionError` subclasses `PyJWKClientError`, so catching the
        parent for "JWKS has no keys -> legacy HS256" would also swallow every
        connection failure and try to verify with the shared secret.
        """
        assert issubclass(jwt.PyJWKClientConnectionError, jwt.PyJWKClientError)
        monkeypatch.setattr(auth_mod.settings, "supabase_url", "https://proj.supabase.co",
                            raising=False)
        monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", HS256_SECRET,
                            raising=False)

        called = []

        class BrokenClient:
            def get_signing_key_from_jwt(self, token):
                raise jwt.PyJWKClientConnectionError("boom")

        monkeypatch.setattr(auth_mod, "jwks_client", BrokenClient())
        real_verify = auth_mod.verify_hs256_token
        monkeypatch.setattr(
            auth_mod, "verify_hs256_token",
            lambda t: called.append(t) or real_verify(t),
        )

        token = jwt.encode(_claims(), HS256_SECRET, algorithm="HS256")
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401
        assert called == [], "symmetric path must not run on a connection failure"


class TestLegacyHs256Path:
    async def test_hs256_rejected_when_no_secret_configured(self, es256_rejecting):
        """No JWKS keys and no configured secret must fail closed, not open."""
        token = jwt.encode(_claims(), HS256_SECRET, algorithm="HS256")
        with pytest.raises(HTTPException) as ctx:
            await _verify(token)
        assert ctx.value.status_code == 401

    def test_verify_hs256_token_requires_explicit_secret(self, monkeypatch):
        monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", "", raising=False)
        token = jwt.encode(_claims(), HS256_SECRET, algorithm="HS256")
        with pytest.raises(jwt.InvalidTokenError) as exc:
            verify_hs256_token(token)
        assert "SUPABASE_JWT_SECRET" in str(exc.value)

    def test_verify_hs256_token_accepts_correct_signature(self, monkeypatch):
        monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", HS256_SECRET,
                            raising=False)
        token = jwt.encode(_claims(), HS256_SECRET, algorithm="HS256")
        assert verify_hs256_token(token)["aud"] == "authenticated"

    def test_verify_hs256_token_rejects_wrong_secret(self, monkeypatch):
        monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", HS256_SECRET,
                            raising=False)
        token = jwt.encode(_claims(), "a-different-secret", algorithm="HS256")
        with pytest.raises(jwt.InvalidSignatureError):
            verify_hs256_token(token)

    def test_verify_hs256_token_rejects_expired(self, monkeypatch):
        monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", HS256_SECRET,
                            raising=False)
        token = jwt.encode(_claims(exp=int(time.time()) - 5), HS256_SECRET,
                           algorithm="HS256")
        with pytest.raises(jwt.ExpiredSignatureError):
            verify_hs256_token(token)

    def test_hs256_secret_is_never_sent_to_the_client(self):
        """The frontend must not be able to learn the signing secret."""
        import pathlib

        web = pathlib.Path(__file__).resolve().parents[3] / "web"
        offenders = [
            p.name for p in web.rglob("*.ts*")
            if p.is_file() and "node_modules" not in p.parts
            and "SUPABASE_JWT_SECRET" in p.read_text(errors="ignore")
        ]
        assert offenders == []