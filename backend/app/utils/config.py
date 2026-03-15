# VibeOS -- Configuration
# Pydantic Settings for environment variable management

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_jwt_secret: str = ""
    qwen_endpoint_url: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
