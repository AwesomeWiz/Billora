# backend/app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    api_prefix: str = "/api"
    sqlite_url: str = "sqlite+aiosqlite:///./billora.db"
    secret_key: str = "CHANGE_ME_IN_PROD"
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
