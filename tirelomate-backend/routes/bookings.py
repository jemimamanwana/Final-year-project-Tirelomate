import logging

from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required

logger = logging.getLogger(__name__)

bookings_bp = Blueprint("bookings", __name__)


@bookings_bp.route("/api/bookings", methods=["GET"])
@token_required
def get_bookings():
    user = request.current_user
    result = (
        supabase.table("bookings")
        .select("*, services(title, category, price), users!provider_id(name)")
        .eq("customer_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    bookings = []
    for b in result.data:
        service = b.pop("services", None)
        provider = b.pop("users", None)
        if service:
            b["service_title"] = service.get("title")
            b["service_category"] = service.get("category")
            b["service_price"] = service.get("price")
        if provider:
            b["provider_name"] = provider.get("name")
        bookings.append(b)

    return jsonify(bookings), 200


@bookings_bp.route("/api/bookings", methods=["POST"])
@token_required
def create_booking():
    user = request.current_user
    data = request.get_json()

    service_id = data.get("service_id")
    provider_id = data.get("provider_id")

    if not service_id or not data.get("date") or not data.get("time"):
        return jsonify({"error": "service_id, date, and time are required"}), 400

    # Auto-lookup provider_id from the service if not provided
    if not provider_id:
        svc_result = (
            supabase.table("services")
            .select("provider_id")
            .eq("id", service_id)
            .execute()
        )
        if svc_result.data:
            provider_id = svc_result.data[0]["provider_id"]
        else:
            return jsonify({"error": "Service not found"}), 404

    booking_data = {
        "customer_id": user["id"],
        "provider_id": provider_id,
        "service_id": service_id,
        "date": data["date"],
        "time": data["time"],
        "total_price": data.get("total_price"),
        "notes": data.get("notes", ""),
    }

    result = supabase.table("bookings").insert(booking_data).execute()
    if not result.data:
        return jsonify({"error": "Failed to create booking"}), 500

    booking = result.data[0]

    try:
        from services.email_service import send_booking_created_email

        provider_result = (
            supabase.table("users")
            .select("email, name")
            .eq("id", provider_id)
            .execute()
        )
        service_result = (
            supabase.table("services")
            .select("title")
            .eq("id", service_id)
            .execute()
        )
        if provider_result.data and service_result.data:
            provider = provider_result.data[0]
            send_booking_created_email(
                provider_email=provider["email"],
                provider_name=provider["name"],
                customer_name=user.get("name", "A customer"),
                service_title=service_result.data[0]["title"],
                booking_date=data["date"],
                booking_time=data["time"],
                notes=data.get("notes", ""),
                booking_id=booking["id"],
            )
    except Exception as exc:
        logger.warning("Could not send booking-created email: %s", exc)

    return jsonify(booking), 201


@bookings_bp.route("/api/bookings/<booking_id>", methods=["PUT"])
@token_required
def update_booking(booking_id):
    data = request.get_json()
    status = data.get("status")

    if not status:
        return jsonify({"error": "Status is required"}), 400

    if status not in ("pending", "confirmed", "in_progress", "completed", "cancelled"):
        return jsonify({"error": "Invalid status"}), 400

    result = (
        supabase.table("bookings")
        .update({"status": status})
        .eq("id", booking_id)
        .execute()
    )

    if not result.data:
        return jsonify({"error": "Booking not found"}), 404

    return jsonify(result.data[0]), 200
