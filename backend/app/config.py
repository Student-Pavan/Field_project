from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+asyncpg://cable_sim:change_me_in_production@localhost:5432/cable_automation"
    )
    secret_key: str = "change_me_use_openssl_rand_hex_32"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    cors_origins: str = (
    cors_origins: str = (
    "http://localhost:5173,"
    "http://localhost:3000,"
    "https://field-project-bay.vercel.app"
    )
    backend_reload: bool = False
    simulation_default_tick_ms: int = 100
    simulation_max_concurrent: int = 10
    app_version: str = "1.0.0"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
