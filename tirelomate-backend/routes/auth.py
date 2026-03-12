from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import hash_password, check_password, create_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    # Validate required fields
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    user_type = data.get("user_type", "customer")

    if not all([name, email, password]):
        return jsonify({"error": "Name, email, and password are required"}), 400

    if user_type not in ("customer", "provider"):
        return jsonify({"error": "Invalid user type"}), 400

    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", email).execute()
    if existing.data:
        return jsonify({"error": "Email already registered"}), 400

    # Hash password and create user
    password_hashed = hash_password(password)
    user_data = {
        "name": name,
        "email": email,
        "password_hash": password_hashed,
        "role": user_type,
    }

    result = supabase.table("users").insert(user_data).execute()
    if not result.data:
        return jsonify({"error": "Failed to create user"}), 500

    user = result.data[0]

    # If provider, create provider_profiles row
    if user_type == "provider":
        supabase.table("provider_profiles").insert({"user_id": user["id"]}).execute()

    # Create JWT token
    token = create_token(user["id"], role=user_type)

    return jsonify({
        "token": token,
        "user_type": user_type,
        "message": "Registration successful",
    }), 201


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "Email and password are required"}), 400

    # Look up user by email
    result = supabase.table("users").select("*").eq("email", email).execute()
    if not result.data:
        return jsonify({"error": "Invalid email or password"}), 401

    user = result.data[0]

    # Verify password
    if not check_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    # Create JWT token
    token = create_token(user["id"], role=user["role"])

    return jsonify({
        "token": token,
        "user_type": user["role"],
        "message": "Login successful",
    }), 200


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logged out"}), 200
