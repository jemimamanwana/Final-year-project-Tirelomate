import string
import random
from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required

payments_bp = Blueprint("payments", __name__)


def _generate_ref():
    chars = string.ascii_uppercase + string.digits
    return "TM-" + "".join(random.choices(chars, k=8))


@payments_bp.route("/api/payments", methods=["POST"])
@token_required
def create_payment():
    user = request.current_user
    data = request.get_json()
    print("[payments] Payment request:", data)

    booking_id = data.get("booking_id")
    amount = data.get("amount")
    payment_method = data.get("payment_method")

    if not booking_id or not amount or not payment_method:
        return jsonify({"error": "booking_id, amount, and payment_method are required"}), 400

    if payment_method not in ("cash", "mobile_money", "card_simulation"):
        return jsonify({"error": "Invalid payment_method"}), 400

    # Look up the booking to get customer_id and provider_id
    booking = (
        supabase.table("bookings")
        .select("customer_id, provider_id")
        .eq("id", booking_id)
        .execute()
    )
    print("[payments] Booking lookup result:", booking.data)
    if not booking.data:
        return jsonify({"error": "Booking not found for id: " + str(booking_id)}), 404

    b = booking.data[0]

    payment_data = {
        "booking_id": booking_id,
        "customer_id": b["customer_id"],
        "provider_id": b["provider_id"],
        "amount": float(amount),
        "payment_method": payment_method,
        "status": "completed",
        "transaction_ref": _generate_ref(),
    }

    result = supabase.table("payments").insert(payment_data).execute()
    if not result.data:
        return jsonify({"error": "Failed to create payment"}), 500

    # Mark booking as completed after successful payment
    supabase.table("bookings").update({"status": "completed"}).eq("id", booking_id).execute()

    return jsonify(result.data[0]), 201


@payments_bp.route("/api/payments", methods=["GET"])
@token_required
def get_payments():
    user = request.current_user
    uid = user["id"]

    # Payments where user is customer or provider
    as_customer = (
        supabase.table("payments")
        .select("*, bookings!booking_id(services(title))")
        .eq("customer_id", uid)
        .order("created_at", desc=True)
        .execute()
    )
    as_provider = (
        supabase.table("payments")
        .select("*, bookings!booking_id(services(title))")
        .eq("provider_id", uid)
        .order("created_at", desc=True)
        .execute()
    )

    # Merge and dedupe
    seen = set()
    payments = []
    for p in as_customer.data + as_provider.data:
        if p["id"] in seen:
            continue
        seen.add(p["id"])
        # Flatten service title
        booking = p.pop("bookings", None)
        if booking and isinstance(booking, dict):
            svc = booking.get("services")
            if svc and isinstance(svc, dict):
                p["service_title"] = svc.get("title")
        payments.append(p)

    payments.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify(payments), 200
