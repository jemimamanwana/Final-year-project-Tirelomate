import logging

from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required

logger = logging.getLogger(__name__)

provider_bp = Blueprint("provider", __name__)


@provider_bp.route("/api/provider/bookings", methods=["GET"])
@token_required
def get_provider_bookings():
    user = request.current_user
    status = request.args.get("status")

    query = (
        supabase.table("bookings")
        .select("*, services(title, category, price), users!customer_id(name, email, phone)")
        .eq("provider_id", user["id"])
    )

    if status and status != "all":
        # Map frontend status values to database status values
        if status == "upcoming":
            query = query.in_("status", ["pending", "confirmed", "in_progress"])
        else:
            query = query.eq("status", status)

    result = query.order("created_at", desc=True).execute()

    bookings = []
    for b in result.data:
        service = b.pop("services", None)
        customer = b.pop("users", None)
        if service:
            b["service_title"] = service.get("title")
            b["service_category"] = service.get("category")
            b["service_price"] = service.get("price")
        if customer:
            b["customer_name"] = customer.get("name")
            b["customer_email"] = customer.get("email")
            b["customer_phone"] = customer.get("phone")
        bookings.append(b)

    return jsonify(bookings), 200


@provider_bp.route("/api/provider/services", methods=["GET"])
@token_required
def get_provider_services():
    user = request.current_user
    result = (
        supabase.table("services")
        .select("*")
        .eq("provider_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return jsonify(result.data), 200


@provider_bp.route("/api/provider/booking/<booking_id>", methods=["PUT"])
@token_required
def update_provider_booking(booking_id):
    user = request.current_user
    data = request.get_json()
    status = data.get("status")

    if not status:
        return jsonify({"error": "Status is required"}), 400

    if status not in ("pending", "confirmed", "in_progress", "completed", "cancelled"):
        return jsonify({"error": "Invalid status"}), 400

    # Verify this booking belongs to the provider
    booking = (
        supabase.table("bookings")
        .select("*")
        .eq("id", booking_id)
        .eq("provider_id", user["id"])
        .execute()
    )

    if not booking.data:
        return jsonify({"error": "Booking not found"}), 404

    try:
        result = (
            supabase.table("bookings")
            .update({"status": status})
            .eq("id", booking_id)
            .execute()
        )
        print(f"[provider] Booking {booking_id} status -> '{status}': {result.data}")
    except Exception as e:
        print(f"[provider] ERROR updating booking {booking_id} to '{status}': {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    if not result.data:
        return jsonify({"error": "Update failed — database may have rejected the status value. Check Supabase constraints."}), 500

    if status == "confirmed":
        try:
            from services.email_service import send_booking_confirmed_email

            bk = booking.data[0]
            customer_result = (
                supabase.table("users")
                .select("email, name")
                .eq("id", bk["customer_id"])
                .execute()
            )
            service_result = (
                supabase.table("services")
                .select("title")
                .eq("id", bk["service_id"])
                .execute()
            )
            if customer_result.data and service_result.data:
                customer = customer_result.data[0]
                send_booking_confirmed_email(
                    customer_email=customer["email"],
                    customer_name=customer["name"],
                    provider_name=user.get("name", "Your provider"),
                    service_title=service_result.data[0]["title"],
                    booking_date=bk.get("date", ""),
                    booking_time=bk.get("time", ""),
                    booking_id=booking_id,
                )
        except Exception as exc:
            logger.warning("Could not send booking-confirmed email: %s", exc)

    return jsonify(result.data[0]), 200
