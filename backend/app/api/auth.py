# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.db import AsyncSessionLocal
from ..core.security import hash_password, verify_password, generate_session_token, hash_token, token_expiry
from ..models.account import Account, Role
from ..models.user import User
from ..models.user_session import UserSession
from ..schemas.auth import RegisterIn, RegisterOut, LoginIn, LoginOut

router = APIRouter(prefix="/auth", tags=["Auth"])

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as db:
        yield db

@router.post("/register", response_model=RegisterOut)
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)):
    # normalize email
    email_norm = payload.email.lower()
    existing = await db.scalar(Account.__table__.select().where(Account.email == email_norm))
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

@router.post("/login", response_model=LoginOut)
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    acct = await db.scalar(Account.__table__.select().where(Account.email == payload.email.lower()))
    if not acct:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = await db.scalar(User.__table__.select().where(User.account_id == acct.id))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    raw = generate_session_token()
    sess = UserSession(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=token_expiry(),
    )
    db.add(sess)
    await db.commit()
    response.set_cookie(key="session_token", value=raw, httponly=True, samesite="lax", max_age=3600)
    return LoginOut(access_token=raw)

async def get_current_user(token: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token")
    token_h = hash_token(token)
    sess = await db.scalar(
        UserSession.__table__.select().where(
            UserSession.token_hash == token_h,
            UserSession.expires_at > func.now(),
            UserSession.is_revoked == False,
        )
    )
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = await db.get(User, sess.user_id)
    account = await db.get(Account, user.account_id)
    return {"user": user, "account": account}

@router.get("/me")
async def me(info: dict = Depends(get_current_user)):
    acct = info["account"]
    return {"account_id": acct.id, "email": acct.email, "role": acct.role}

@router.post("/logout")
async def logout(response: Response, token: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    if token:
        token_h = hash_token(token)
        await db.execute(
            UserSession.__table__.update()
            .where(UserSession.token_hash == token_h)
            .values(is_revoked=True)
        )
        await db.commit()
    response.delete_cookie("session_token")
    return {"detail": "logged out"}
