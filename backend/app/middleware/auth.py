"""Authentication middleware for JWT verification.

Uses Supabase Auth to verify JWT tokens and extract user info.
"""

from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.services.supabase import get_supabase_client_anon
from app.models.schemas import User


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> User:
    """
    Verify JWT token from Supabase Auth and return the current user.
    
    The token is expected in the Authorization header as: Bearer <token>
    
    Usage in router:
        @router.get("/protected")
        async def protected_route(user: User = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    token = credentials.credentials
    
    try:
        # Use anon client to verify token via Supabase Auth
        supabase = get_supabase_client_anon()
        
        # Get user from Supabase using the access token
        response = supabase.auth.get_user(token)
        
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
    credentials: HTTPAuthorizationCredentials = Security(security, auto_error=False)
) -> User | None:
    """
    Optionally get the current user if a valid token is provided.
    Returns None if no token or invalid token.
    
    Usage in router:
        @router.get("/public-or-private")
        async def mixed_route(user: User | None = Depends(get_optional_user)):
            if user:
                return {"message": f"Hello {user.name}"}
            return {"message": "Hello anonymous"}
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