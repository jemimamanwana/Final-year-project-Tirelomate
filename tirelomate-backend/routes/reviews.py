from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("/api/services/<service_id>/reviews", methods=["GET"])
def get_reviews(service_id):
    # Get the provider_id for this service
    service = supabase.table("services").select("provider_id").eq("id", service_id).execute()
    if not service.data:
        return jsonify({"error": "Service not found"}), 404

    provider_id = service.data[0]["provider_id"]

    result = (
        supabase.table("reviews")
        .select("*, users!customer_id(name, avatar_url)")
        .eq("provider_id", provider_id)
        .order("created_at", desc=True)
        .execute()
    )

    reviews = []
    for r in result.data:
        customer = r.pop("users", None)
        if customer:
            r["customer_name"] = customer.get("name")
            r["customer_avatar"] = customer.get("avatar_url")
        reviews.append(r)

    return jsonify(reviews), 200


@reviews_bp.route("/api/services/<service_id>/reviews", methods=["POST"])
@token_required
def create_review(service_id):
    user = request.current_user
    data = request.get_json()

    rating = data.get("rating")
    comment = data.get("comment", "")
    booking_id = data.get("booking_id")

    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({"error": "Rating (1-5) is required"}), 400

    # Prevent duplicate reviews for the same booking
    if booking_id:
        existing = (
            supabase.table("reviews")
            .select("id")
            .eq("booking_id", booking_id)
            .execute()
        )
        if existing.data:
            return jsonify({"error": "You already reviewed this booking"}), 400

    # Get service to find provider_id
    service = supabase.table("services").select("provider_id").eq("id", service_id).execute()
    if not service.data:
        return jsonify({"error": "Service not found"}), 404

    review_data = {
        "customer_id": user["id"],
        "provider_id": service.data[0]["provider_id"],
        "rating": int(rating),
        "comment": comment,
        "booking_id": booking_id,
    }

    result = supabase.table("reviews").insert(review_data).execute()
    if not result.data:
        return jsonify({"error": "Failed to create review"}), 500

    return jsonify(result.data[0]), 201


@reviews_bp.route("/api/provider/<provider_id>/rating", methods=["GET"])
def get_provider_rating(provider_id):
    """Calculate average rating and review count for a provider."""
    result = (
        supabase.table("reviews")
        .select("rating")
        .eq("provider_id", provider_id)
        .execute()
    )

    if not result.data:
        return jsonify({"average_rating": 0, "review_count": 0}), 200

    ratings = [r["rating"] for r in result.data]
    avg = round(sum(ratings) / len(ratings), 1)

    return jsonify({"average_rating": avg, "review_count": len(ratings)}), 200


@reviews_bp.route("/api/provider/<provider_id>/reviews", methods=["GET"])
def get_provider_reviews(provider_id):
    """Get all reviews for a specific provider."""
    result = (
        supabase.table("reviews")
        .select("*, users!customer_id(name, avatar_url)")
        .eq("provider_id", provider_id)
        .order("created_at", desc=True)
        .execute()
    )

    reviews = []
    for r in result.data:
        customer = r.pop("users", None)
        if customer:
            r["customer_name"] = customer.get("name")
            r["customer_avatar"] = customer.get("avatar_url")
        reviews.append(r)

    return jsonify(reviews), 200
