# backend/app/core/permissions.py
"""Permission utilities for role‑based access control.

The ``get_current_user`` dependency (in ``app/api/auth.py``) returns a dict
``{"user": User, "account": Account}``.  The ``role`` lives on the ``Account``
object, so ``require_role`` extracts it from ``current_user["account"].role``
and raises ``403`` when the role is not authorized.
"""

from fastapi import Depends, HTTPException, status

from app.api.auth import get_current_user


def require_role(*allowed_roles: str):
    """Dependency that ensures the authenticated user has one of ``allowed_roles``.

    Usage::
        @router.post("/admin")
        async def admin_endpoint(user=Depends(require_role("ADMIN"))):
            ...
    """

    async def role_checker(current_user=Depends(get_current_user)):
        # ``current_user`` is a dict with keys "user" and "account"
        account = current_user.get("account")
        role = getattr(account, "role", None)
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return role_checker
