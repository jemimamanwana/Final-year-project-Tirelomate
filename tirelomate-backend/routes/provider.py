from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required

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
            query = query.in_("status", ["pending", "confirmed"])
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

    if status not in ("pending", "confirmed", "completed", "cancelled"):
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

    result = (
        supabase.table("bookings")
        .update({"status": status})
        .eq("id", booking_id)
        .execute()
    )

    return jsonify(result.data[0]), 200
