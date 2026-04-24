import logging

from flask import Blueprint, request, jsonify
from flask_mail import Message

from utils.auth_helpers import token_required

logger = logging.getLogger(__name__)

dev_email_bp = Blueprint("dev_email", __name__)


@dev_email_bp.route("/api/dev/send-test-email", methods=["POST"])
@token_required
def send_test_email():
    data = request.get_json(silent=True) or {}
    to = data.get("to") or request.current_user.get("email")
    if not to:
        return jsonify({"ok": False, "error": "No recipient provided"}), 400

    try:
        from app import mail
        msg = Message(
            subject="TireloMate test email",
            recipients=[to],
            body="This is a TireloMate SMTP test. If you received this, email is configured correctly.",
            html=(
                "<p>This is a <strong>TireloMate</strong> SMTP test.</p>"
                "<p>If you received this, email is configured correctly.</p>"
            ),
        )
        mail.send(msg)
        return jsonify({"ok": True, "sent_to": to}), 200
    except Exception as exc:
        logger.exception("Test email send failed: %s", exc)
        return jsonify({"ok": False, "error": str(exc)}), 500
