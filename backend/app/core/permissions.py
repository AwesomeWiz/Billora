
# backend/app/core/permissions.py

from fastapi import Depends, HTTPException, status

from app.api.auth import get_current_user


def require_role(*allowed_roles: str):
    """Restrict an endpoint to users with one of the allowed roles."""

    async def role_checker(current_user=Depends(get_current_user)):
        role = getattr(current_user, "role", None)

        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user

    return role_checker
