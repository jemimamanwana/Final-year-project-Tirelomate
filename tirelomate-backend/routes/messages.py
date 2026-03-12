from flask import Blueprint, request, jsonify
from utils.auth_helpers import token_required

messages_bp = Blueprint("messages", __name__)


@messages_bp.route("/api/messages", methods=["GET"])
@token_required
def get_messages():
    # Placeholder for Sprint 5-6
    return jsonify([]), 200


@messages_bp.route("/api/messages", methods=["POST"])
@token_required
def send_message():
    # Placeholder for Sprint 5-6
    return jsonify({"message": "Messaging coming soon"}), 200


@messages_bp.route("/api/chat", methods=["POST"])
@token_required
def chat():
    # Placeholder for AI chat - Sprint 5-6
    data = request.get_json()
    message = data.get("message", "")
    return jsonify({
        "response": f"Thank you for your message. AI chat is coming soon! You said: {message}"
    }), 200


@messages_bp.route("/api/ai-match", methods=["POST"])
@token_required
def ai_match():
    # Placeholder for AI matching - Sprint 5-6
    from services.matching import match_providers
    data = request.get_json()
    result = match_providers(
        data.get("service", ""),
        data.get("location", ""),
        data.get("top_n", 1),
    )
    return jsonify(result), 200
