# VibeOS -- Configuration
# Pydantic Settings for environment variable management

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    qwen_endpoint_url: str = ""
    qwen_model_name: str = "Qwen/Qwen3.5-9B-Instruct"
    cors_origins: str = ""
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_refresh_token: str = ""
    ticketmaster_api_key: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
