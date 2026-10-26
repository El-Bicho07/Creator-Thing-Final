from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from jwt.exceptions import (
    PyJWKClientConnectionError,
    PyJWKClientError,
    PyJWKError,
)
from typing import Optional, Set
import http.client
import json

from app.core.config import settings
from app.core.db import async_session_maker, rls_scoped_session
from app.core.logging import get_logger
from sqlalchemy import text

logger = get_logger(__name__)

security = HTTPBearer(auto_error=False)

jwks_client: Optional[PyJWKClient] = None

# ---------------------------------------------------------------------------
# Signing algorithms
# ---------------------------------------------------------------------------
#
# Supabase signs with an asymmetric key and publishes the matching PUBLIC key at
# `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. This project publishes an EC
# P-256 key, i.e. it signs access tokens with ES256 -- which is why a verifier
# hard-coded to `algorithms=["RS256"]` rejects every real token with
# "The specified alg value is not allowed".
#
# The allow-list below is deliberately restricted to PUBLIC-KEY algorithms:
#
#   * HS256/HS384/HS512 are absent on purpose. Accepting an HMAC algorithm here
#     is the classic JWT confusion attack -- an attacker signs a token with the
#     *public* key (which JWKS publishes and anyone can fetch) as the HMAC secret,
#     and the verifier accepts it because it only ever checked a key type. If a
#     deployment ever does run legacy HS256, it must take the symmetric path in
#     `verify_hs256_token` below, which is server-side only.
#   * `none` is never present, and PyJWKClient only ever hands back keys that came
#     from the project's own JWKS endpoint.
#
# The algorithm actually used for a request is derived from the KEY we resolved,
# not from the token's `alg` header -- trusting the header would let a caller
# choose the verification mode.
SUPPORTED_ALGORITHMS: Set[str] = {
    "ES256", "ES384", "ES512",
    "RS256", "RS384", "RS512",
    "PS256", "PS384", "PS512",
    "EdDSA",
}

#: Transport failures that PyJWT lets escape `PyJWKClient.fetch_data`. It wraps only
#: `URLError` and `TimeoutError`, so a peer that closes the connection mid-fetch
#: (`http.client.RemoteDisconnected`, which is a `ConnectionResetError`) arrives
#: raw and used to become an unhandled 500 instead of a clean rejection.
_JWKS_TRANSPORT_ERRORS = (OSError, http.client.HTTPException)


async def get_jwks_client() -> PyJWKClient:
    global jwks_client
    if jwks_client is None:
        if not settings.supabase_url:
            raise RuntimeError("SUPABASE_URL not configured")
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        jwks_client = PyJWKClient(jwks_url)
    return jwks_client


def _expected_algorithm(signing_key) -> str:
    """The one algorithm the JWKS key we resolved is allowed to verify.

    Read from the key itself (`PyJWK.algorithm_name` is derived from the JWK's
    `alg`/`kty`/`crv` as published by Supabase), never from the token header.
    """
    alg = getattr(signing_key, "algorithm_name", None)
    if not alg:
        raise jwt.InvalidTokenError("JWKS key does not declare a signing algorithm")
    if alg not in SUPPORTED_ALGORITHMS:
        # A symmetric key here would mean the project is on legacy HS256, which
        # this verifier refuses on purpose. Say so instead of failing obscurely.
        raise jwt.InvalidTokenError(
            f"Unsupported JWKS signing algorithm: {alg}"
        )
    return alg


def _expected_issuer() -> Optional[str]:
    """The `iss` a genuine Supabase access token for this project carries.

    Returned separately from the options dict because PyJWT reads the expected
    issuer from the `issuer=` kwarg, NOT from `options["iss"]`: passing it only
    in options sets the `verify_iss` switch while the expected value stays
    `None`, and `_validate_iss` returns immediately in that case -- silently
    skipping the check while looking like it is enforced.
    """
    issuer = (settings.supabase_url or "").rstrip("/")
    return f"{issuer}/auth/v1" if issuer else None


def _decode_options() -> dict:
    options: dict = {"verify_exp": True, "require": ["exp", "sub"]}
    if _expected_issuer():
        options["verify_iss"] = True
    return options


def verify_hs256_token(token: str) -> dict:
    """Verify a LEGACY HS256 token against the configured shared secret.

    Supabase only falls back to HS256 (its `SUPABASE_JWT_SECRET`) for projects
    that never enabled asymmetric signing keys, and only publishes a JWKS
    containing an `oct` key in that case. This path is here so such a deployment
    fails loudly on configuration rather than silently rejecting every user, and
    it is deliberately server-side: `supabase_jwt_secret` is never exposed to the
    frontend and never logged.

    Requires `SUPABASE_JWT_SECRET` to be explicitly configured; it is never
    inferred, so an unconfigured deployment cannot accidentally verify anything.
    """
    secret = settings.supabase_jwt_secret
    if not secret:
        raise jwt.InvalidTokenError(
            "Project signs with HS256 but SUPABASE_JWT_SECRET is not configured"
        )
    options = _decode_options()
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],  # exactly one; never the token's own header
        audience="authenticated",
        options=options,
    )


async def get_current_user_id(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        client = await get_jwks_client()
        try:
            signing_key = client.get_signing_key_from_jwt(token)
        except PyJWKClientConnectionError as exc:
            # Could not REACH the JWKS endpoint. This is infrastructure, not a
            # bad token and not a legacy project -- and it must never fall
            # through to the HS256 path below, which would then try to verify
            # against a shared secret for a reason that has nothing to do with
            # this failure.
            logger.error("Supabase JWKS unreachable: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: signing keys unavailable",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except _JWKS_TRANSPORT_ERRORS as exc:
            # PyJWT's fetch_data only wraps URLError/TimeoutError, so a dropped
            # connection (`http.client.RemoteDisconnected`, a ConnectionResetError)
            # escapes it entirely and used to surface as a 500. Treat every
            # transport failure the same way as the one PyJWT does wrap.
            logger.error("Supabase JWKS transport error: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: signing keys unavailable",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except PyJWKClientError:
            # The JWKS was reached but advertises no usable signing key: the
            # project is on legacy HS256 signing. Take the symmetric path.
            payload = verify_hs256_token(token)
        except PyJWKError as exc:
            # Unknown kid, or a key type the JWK parser rejects. An HMAC token
            # presented to an asymmetric project lands here too.
            raise jwt.InvalidTokenError(f"Unknown signing key: {exc}") from exc
        else:
            algorithm = _expected_algorithm(signing_key)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[algorithm],  # derived from the key, not the token
                audience="authenticated",
                issuer=_expected_issuer(),
                options=_decode_options(),
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
                headers={"WWW-Authenticate": "Bearer"},
            )

        request.state.user_id = user_id
        request.state.jwt_payload = payload
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except PyJWKClientError as e:
        # JWKS is unreachable or malformed. This is an infrastructure failure,
        # not a bad token, so it is logged as an error and still answered 401
        # rather than 500 -- but the two must not be conflated in the logs.
        logger.error("Supabase JWKS unavailable: %s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: signing keys unavailable",
            headers={"WWW-Authenticate": "Bearer"},
        )


class CurrentUser:
    def __init__(self, user_id: str):
        self.id = user_id


async def get_current_user(
    user_id: str = Depends(get_current_user_id)
) -> CurrentUser:
    return CurrentUser(user_id)


async def get_db_with_user(
    request: Request,
    user_id: str = Depends(get_current_user_id)
):
    """Database session with user context for RLS.

    Two correctness/safety points, both learned from testing this against real
    PostgreSQL:

    1. `set_config(..., is_local := false)` (SESSION scope), not `SET LOCAL`.
       `SET LOCAL` is transaction-scoped, so the identity disappeared the moment
       a request committed -- after which `current_user_id()` returns the zero
       UUID and RLS silently hides ALL of that creator's rows.

    2. The claims are cleared in the `finally` block before the connection
       returns to the pool. Session-scope settings otherwise persist on the
       physical connection and would be inherited by the *next* request that
       happens to be handed the same pooled connection -- a cross-user identity
       leak. Explicit `RESET` makes the boundary deterministic.

    The claims are also bound as a parameter rather than interpolated, so a claim
    containing a quote cannot break out of the statement.

    3. The local `users` row is self-provisioned on first authenticated request.
       Supabase Auth owns identity in `auth.users`, but this database keeps its own
       `users` table, and every other table carries `REFERENCES users(id)`. A
       creator who signs up but has no row yet therefore reads an empty plan and
       gets a 409 "Data integrity violation" on the first write -- a foreign key
       failure, not an authorization one.

       The insert runs *inside* the RLS-scoped session and is therefore subject to
       the `users` self-access policy: the `WITH CHECK (current_user_id() = id)`
       clause means the database, not this code, guarantees a creator can only ever
       create their own row. It is `ON CONFLICT DO NOTHING`, so it is idempotent
       and costs one no-op statement per request. No trust boundary is moved from
       the database into the application.
    """
    claims = request.state.jwt_payload
    async with rls_scoped_session(claims) as session:
        await session.execute(
            text("INSERT INTO users (id, email) VALUES (:id, :email) ON CONFLICT DO NOTHING"),
            {"id": user_id, "email": claims.get("email") or ""},
        )
        await session.commit()
        yield session