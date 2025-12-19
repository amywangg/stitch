"""
Configuration settings for the AI service.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # API Keys
    openai_api_key: str = ""
    
    # Database
    database_url: str = "postgresql://stitch:stitch_dev_password@localhost:5432/stitch"
    
    # Backend API (for cache lookups)
    backend_url: str = "http://localhost:3001"
    
    # CORS - stored as comma-separated string in .env
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # File Upload
    max_upload_size_mb: int = 50
    allowed_file_types: str = ".pdf"
    
    # AI Settings
    ai_model: str = "gpt-4o-mini"  # Faster and cheaper model (default)
    ai_temperature: float = 0.1  # Lower temperature for more consistent parsing (reduced from 0.3)
    
    # Feature Flags
    enable_ocr: bool = True  # Enable OCR for scanned PDFs
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        if not self.cors_origins:
            return ["http://localhost:3000", "http://localhost:5173"]
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]
    
    @property
    def allowed_file_types_list(self) -> List[str]:
        """Get allowed file types as a list."""
        if not self.allowed_file_types:
            return [".pdf"]
        return [ft.strip() for ft in self.allowed_file_types.split(',') if ft.strip()]


settings = Settings()
