from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional

from src.application.services import AccessibilityService
from src.domain.models.user import User
from src.infrastructure.config import Settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
) -> User:
    """
    Validates JWT token and returns current user
    """
    try:
        settings = request.app.state.settings
        
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"]
        )
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        user_repo = request.app.state.user_repository
        user = await user_repo.get_by_id(user_id)
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_accessibility_service(request: Request) -> AccessibilityService:
    """
    Dependency to get accessibility service with all dependencies injected
    """
    # This would be created with proper dependency injection
    # For brevity, returning a mock service
    return request.app.state.accessibility_service