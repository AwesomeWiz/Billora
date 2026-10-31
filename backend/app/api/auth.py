# backend/app/api/auth.py
from ..models.user_session import UserSession
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Header
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from ..core.db import AsyncSessionLocal
from ..core.security import hash_password, verify_password, generate_session_token, hash_token, token_expiry
from ..models.account import Account, Role
from ..models.user import User
import secrets

from ..schemas.auth import RegisterIn, RegisterOut, LoginIn, LoginOut, CsrfOut

router = APIRouter(prefix="/auth", tags=["Auth"])

SESSION_COOKIE = "session_token"
CSRF_COOKIE = "csrf_token"
COOKIE_MAX_AGE = 3600

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as db:
        yield db

def verify_csrf(csrf_header: str = Header(..., alias="X-CSRF-Token"), csrf_cookie: str = Cookie(None, alias=CSRF_COOKIE)):
    if not csrf_cookie or csrf_header != csrf_cookie:
        raise HTTPException(status_code=403, detail="Invalid CSRF token")
    return True

@router.get("/csrf", response_model=CsrfOut)
async def get_csrf(response: Response, csrf: str = Cookie(None, alias=CSRF_COOKIE)):
    if not csrf:
        csrf = secrets.token_urlsafe(32)
    response.set_cookie(key=CSRF_COOKIE, value=csrf, httponly=False, samesite="lax", max_age=COOKIE_MAX_AGE)
    return {"csrf_token": csrf}

@router.post("/register", response_model=RegisterOut, dependencies=[Depends(verify_csrf)])
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)):
    email_norm = payload.email.lower()
    existing = await db.scalar(
    select(Account).where(Account.email == email_norm)
)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    acct = Account(email=email_norm, role=Role.CUSTOMER)
    db.add(acct)
    await db.flush()
    user = User(account_id=acct.id, hashed_password=hash_password(payload.password))
    db.add(user)
    await db.flush()
    await db.commit()
    return RegisterOut(account_id=acct.id, user_id=user.id, role=acct.role)

@router.post("/login", response_model=LoginOut, dependencies=[Depends(verify_csrf)])
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    acct = await db.scalar(
    select(Account).where(Account.email == payload.email.lower())
)
    if not acct:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = await db.scalar(
    select(User).where(User.account_id == acct.id)
)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    raw = generate_session_token()
    sess = UserSession(user_id=user.id, token_hash=hash_token(raw), expires_at=token_expiry())
    db.add(sess)
    await db.commit()
    response.set_cookie(key=SESSION_COOKIE, value=raw, httponly=True, samesite="lax", max_age=COOKIE_MAX_AGE)
    return LoginOut(detail="logged in")

async def get_current_user(token: str = Cookie(None, alias=SESSION_COOKIE), db: AsyncSession = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token")
    token_h = hash_token(token)
    sess = await db.scalar(
    select(UserSession).where(
        UserSession.token_hash == token_h,
        UserSession.expires_at > func.now(),
        UserSession.is_revoked.is_(False),
    )
)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = await db.get(User, sess.user_id)
    account = await db.get(Account, user.account_id)
    return {"user": user, "account": account}

@router.get("/me")
async def me(info: dict = Depends(get_current_user), csrf: str = Cookie(None, alias=CSRF_COOKIE)):
    acct = info["account"]
    return {"user": {"account_id": acct.id, "email": acct.email, "role": acct.role}, "csrf_token": csrf}

@router.post("/logout", dependencies=[Depends(verify_csrf)])
async def logout(response: Response, token: str = Cookie(None, alias=SESSION_COOKIE), db: AsyncSession = Depends(get_db)):
    if token:
        token_h = hash_token(token)
        await db.execute(
            UserSession.__table__.update()
            .where(UserSession.token_hash == token_h)
            .values(is_revoked=True)
        )
        await db.commit()
    response.delete_cookie(SESSION_COOKIE)
    response.delete_cookie(CSRF_COOKIE)
    return {"detail": "logged out"}
