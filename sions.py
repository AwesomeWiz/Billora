warning: in the working copy of 'backend/app/core/permissions.py', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/backend/app/core/permissions.py b/backend/app/core/permissions.py[m
[1mindex f017b52..663159e 100644[m
[1m--- a/backend/app/core/permissions.py[m
[1m+++ b/backend/app/core/permissions.py[m
[36m@@ -1,5 +1,11 @@[m
[31m-[m
 # backend/app/core/permissions.py[m
[32m+[m[32m"""Permission utilities for role‑based access control.[m
[32m+[m
[32m+[m[32mThe ``get_current_user`` dependency (in ``app/api/auth.py``) returns a dict[m
[32m+[m[32m``{"user": User, "account": Account}``.  The ``role`` lives on the ``Account``[m
[32m+[m[32mobject, so ``require_role`` extracts it from ``current_user["account"].role``[m
[32m+[m[32mand raises ``403`` when the role is not authorized.[m
[32m+[m[32m"""[m
 [m
 from fastapi import Depends, HTTPException, status[m
 [m
[36m@@ -7,17 +13,23 @@[m [mfrom app.api.auth import get_current_user[m
 [m
 [m
 def require_role(*allowed_roles: str):[m
[31m-    """Restrict an endpoint to users with one of the allowed roles."""[m
[32m+[m[32m    """Dependency that ensures the authenticated user has one of ``allowed_roles``.[m
 [m
[31m-    async def role_checker(current_user=Depends(get_current_user)):[m
[31m-        role = getattr(current_user, "role", None)[m
[32m+[m[32m    Usage::[m
[32m+[m[32m        @router.post("/admin")[m
[32m+[m[32m        async def admin_endpoint(user=Depends(require_role("ADMIN"))):[m
[32m+[m[32m            ...[m
[32m+[m[32m    """[m
 [m
[32m+[m[32m    async def role_checker(current_user=Depends(get_current_user)):[m
[32m+[m[32m        # ``current_user`` is a dict with keys "user" and "account"[m
[32m+[m[32m        account = current_user.get("account")[m
[32m+[m[32m        role = getattr(account, "role", None)[m
         if role not in allowed_roles:[m
             raise HTTPException([m
                 status_code=status.HTTP_403_FORBIDDEN,[m
                 detail="Insufficient permissions",[m
             )[m
[31m-[m
         return current_user[m
 [m
     return role_checker[m
