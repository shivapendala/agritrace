from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriTrace"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # JWT Settings
    SECRET_KEY: str = "super_secret_jwt_key_change_in_production_32bytes_min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database Configuration
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "agritrace"
    POSTGRES_PASSWORD: str = "agritrace_secret_pass"
    POSTGRES_DB: str = "agritrace_db"
    POSTGRES_PORT: str = "5432"
    DATABASE_URL: Union[str, None] = None

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


settings = Settings()
