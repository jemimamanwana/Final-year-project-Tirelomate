from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required

messages_bp = Blueprint("messages", __name__)


@messages_bp.route("/api/messages/conversations", methods=["GET"])
@token_required
def get_conversations():
    """Return unique users the current user has messaged with, with last message."""
    user = request.current_user
    uid = user["id"]

    # Fetch all messages involving this user
    sent = (
        supabase.table("messages")
        .select("*, users!receiver_id(name, email, avatar_url)")
        .eq("sender_id", uid)
        .order("created_at", desc=True)
        .execute()
    )
    received = (
        supabase.table("messages")
        .select("*, users!sender_id(name, email, avatar_url)")
        .eq("receiver_id", uid)
        .order("created_at", desc=True)
        .execute()
    )

    # Build conversation map keyed by the other user's id
    convos = {}
    for m in sent.data:
        other_id = m["receiver_id"]
        other_user = m.pop("users", None)
        if other_id not in convos or m["created_at"] > convos[other_id]["last_message_at"]:
            convos[other_id] = {
                "user_id": other_id,
                "user_name": other_user.get("name") if other_user else "User",
                "user_email": other_user.get("email") if other_user else "",
                "user_avatar": other_user.get("avatar_url") if other_user else None,
                "last_message": m["content"],
                "last_message_at": m["created_at"],
                "is_mine": True,
            }

    for m in received.data:
        other_id = m["sender_id"]
        other_user = m.pop("users", None)
        if other_id not in convos or m["created_at"] > convos[other_id]["last_message_at"]:
            convos[other_id] = {
                "user_id": other_id,
                "user_name": other_user.get("name") if other_user else "User",
                "user_email": other_user.get("email") if other_user else "",
                "user_avatar": other_user.get("avatar_url") if other_user else None,
                "last_message": m["content"],
                "last_message_at": m["created_at"],
                "is_mine": False,
            }

    # Sort by most recent
    result = sorted(convos.values(), key=lambda c: c["last_message_at"], reverse=True)
    return jsonify(result), 200


@messages_bp.route("/api/messages", methods=["GET"])
@token_required
def get_messages():
    """Return all messages between current user and another user."""
    user = request.current_user
    uid = user["id"]
    other_id = request.args.get("with")

    if not other_id:
        return jsonify({"error": "'with' query parameter is required"}), 400

    # Messages where current user is sender and other is receiver, or vice versa
    sent = (
        supabase.table("messages")
        .select("*")
        .eq("sender_id", uid)
        .eq("receiver_id", other_id)
        .execute()
    )
    received = (
        supabase.table("messages")
        .select("*")
        .eq("sender_id", other_id)
        .eq("receiver_id", uid)
        .execute()
    )

    all_messages = sent.data + received.data
    all_messages.sort(key=lambda m: m["created_at"])

    return jsonify(all_messages), 200


@messages_bp.route("/api/messages", methods=["POST"])
@token_required
def send_message():
    """Send a message to another user."""
    user = request.current_user
    data = request.get_json()

    receiver_id = data.get("receiver_id")
    content = data.get("content")

    if not receiver_id or not content:
        return jsonify({"error": "receiver_id and content are required"}), 400

    message_data = {
        "sender_id": user["id"],
        "receiver_id": receiver_id,
        "content": content,
    }

    booking_id = data.get("booking_id")
    if booking_id:
        message_data["booking_id"] = booking_id

    result = supabase.table("messages").insert(message_data).execute()
    if not result.data:
        return jsonify({"error": "Failed to send message"}), 500

    return jsonify(result.data[0]), 201


@messages_bp.route("/api/chat", methods=["POST"])
@token_required
def chat():
    """AI chat placeholder."""
    data = request.get_json()
    message = data.get("message", "")
    return jsonify({
        "response": f"Thank you for your message. AI chat is coming soon! You said: {message}"
    }), 200


@messages_bp.route("/api/ai-match", methods=["POST"])
@token_required
def ai_match():
    """AI matching endpoint."""
    from services.matching import match_providers
    data = request.get_json()
    result = match_providers(
        data.get("service", ""),
        data.get("location", ""),
        data.get("top_n", 1),
    )
    return jsonify(result), 200
