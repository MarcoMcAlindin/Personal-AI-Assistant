# SuperCyan -- Configuration
# Pydantic Settings for environment variable management

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    qwen_endpoint_url: str = ""
    qwen_model_name: str = "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF"
    ollama_endpoint_url: str = ""
    ollama_model_name: str = "qwen2.5:7b"
    cors_origins: str = ""
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_refresh_token: str = ""
    ticketmaster_api_key: str = ""
    serper_api_key: str = ""
    google_redirect_uri: str = ""
    frontend_url: str = "http://localhost:3000"
    vibeos_dev_mode: bool = False
    vibeos_dev_user_id: str = "ceo-dev-user"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
