from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from typing import Optional
import json

from app.core.config import settings
from app.core.db import async_session_maker, rls_scoped_session
from app.core.logging import get_logger
from sqlalchemy import text

logger = get_logger(__name__)

security = HTTPBearer(auto_error=False)

jwks_client: Optional[PyJWKClient] = None


async def get_jwks_client() -> PyJWKClient:
    global jwks_client
    if jwks_client is None:
        if not settings.supabase_url:
            raise RuntimeError("SUPABASE_URL not configured")
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        jwks_client = PyJWKClient(jwks_url)
    return jwks_client


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
        signing_key = client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience="authenticated",
            options={"verify_exp": True}
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
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
    """
    async with rls_scoped_session(request.state.jwt_payload) as session:
        yield session