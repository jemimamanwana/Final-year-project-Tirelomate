import bcrypt
import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from config import Config


def hash_password(password):
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password, password_hash):
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_token(user_id, role=None):
    """Create a JWT token with user_id and 24hr expiry."""
    payload = {
        "user_id": str(user_id),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        "iat": datetime.datetime.utcnow(),
    }
    if role:
        payload["role"] = role
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token):
    """Decode a JWT token. Returns payload dict or None."""
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def token_required(f):
    """Decorator that extracts and validates the Bearer token.
    Attaches user data to request.current_user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Session expired. Please log in again."}), 401

        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Session expired. Please log in again."}), 401

        # Fetch user from database
        from models.supabase_client import supabase

        result = (
            supabase.table("users")
            .select("*")
            .eq("id", payload["user_id"])
            .execute()
        )
        if not result.data:
            return jsonify({"error": "User not found"}), 401

        request.current_user = result.data[0]
        return f(*args, **kwargs)

    return decorated
