from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings
from app.services import get_supabase
from app.models.schemas import User

security = HTTPBearer()
settings = get_settings()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> User:
    """
    Verify JWT token from Supabase Auth and return the current user.
    
    The token is expected in the Authorization header as: Bearer <token>
    """
    token = credentials.credentials
    
    try:
        # Supabase uses the SUPABASE_URL/auth/v1 for JWT verification
        # The JWT secret is derived from the project's JWT secret
        # For Supabase, we verify the token by calling their API
        
        supabase = get_supabase()
        
        # Get user from Supabase using the access token
        response = supabase.auth.get_user(token)
        
        if response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        
        user_data = response.user
        
        return User(
            id=user_data.id,
            email=user_data.email,
            name=user_data.user_metadata.get("full_name") or user_data.user_metadata.get("name"),
            avatar_url=user_data.user_metadata.get("avatar_url"),
            created_at=user_data.created_at
        )
        
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
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None