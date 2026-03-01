"""Authentication middleware for JWT verification.

Uses Supabase Auth to verify JWT tokens and extract user info.
"""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.supabase import get_supabase_client_anon
from app.models.schemas import User


# Security schemes for OpenAPI documentation + request auth parsing
security = HTTPBearer(
    scheme_name="SupabaseBearerAuth",
    bearerFormat="JWT",
    description="Supabase access token. Use: Bearer <access_token>.",
)
security_optional = HTTPBearer(
    auto_error=False,
    scheme_name="SupabaseBearerAuth",
    bearerFormat="JWT",
    description="Optional Supabase access token. Use: Bearer <access_token>.",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Verify JWT token from Supabase Auth and return the current user.
    
    The token is expected in the Authorization header as: Bearer <token>
    """
    token = credentials.credentials
    
    try:
        # Use anon client to verify token via Supabase Auth
        supabase = await get_supabase_client_anon()
        
        # Get user from Supabase using the access token
        response = await supabase.auth.get_user(token)
        
        if response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        
        user_data = response.user
        
        return User(
            id=str(user_data.id),
            email=user_data.email,
            name=user_data.user_metadata.get("full_name") or user_data.user_metadata.get("name"),
            avatar_url=user_data.user_metadata.get("avatar_url"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Could not validate credentials: {str(e)}"
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional)
) -> User | None:
    """
    Optionally get the current user if a valid token is provided.
    Returns None if no token or invalid token.
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def get_user_id(user: User) -> str:
    """Extract user ID as string (helper for database operations)."""
    return str(user.id)
