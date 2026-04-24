import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for backend
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-secret-change-me")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")

    # Flask-Mail / SMTP
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "TireloMate <no-reply@tirelomate.com>")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5500")
