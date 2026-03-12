from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required
from utils.helpers import format_user

user_bp = Blueprint("user", __name__)


@user_bp.route("/api/user/me", methods=["GET"])
@token_required
def get_current_user():
    user = dict(request.current_user)
    # Frontend expects 'user_type' not 'role'
    user["user_type"] = user.get("role", "customer")
    format_user(user)
    return jsonify(user), 200


@user_bp.route("/api/user/<user_id>", methods=["PUT"])
@token_required
def update_user(user_id):
    # Ensure users can only update their own profile
    if request.current_user["id"] != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()

    # Only allow updating specific fields
    allowed_fields = ["name", "phone", "avatar_url", "location_lat", "location_lng"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    result = (
        supabase.table("users")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )

    if not result.data:
        return jsonify({"error": "Failed to update user"}), 500

    user = result.data[0]
    user["user_type"] = user.get("role", "customer")
    format_user(user)
    return jsonify(user), 200
