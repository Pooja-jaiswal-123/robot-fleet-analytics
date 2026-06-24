from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    clickhouse_host: str = "clickhouse"
    clickhouse_port: int = 8123
    clickhouse_user: str = "analytics_api"
    clickhouse_password: str = "analytics_api_ro"
    clickhouse_database: str = "warehouse"

    # Optional: only needed for the natural-language query panel.
    # Leave unset to disable that feature without breaking the rest of the app.
    anthropic_api_key: str | None = None
    nl2sql_model: str = "claude-sonnet-4-6"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    class Config:
        env_file = ".env"
        env_prefix = ""


settings = Settings()
