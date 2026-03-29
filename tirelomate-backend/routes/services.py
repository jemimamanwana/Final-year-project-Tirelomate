from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required
from services.dijkstra import find_nearest_providers

services_bp = Blueprint("services", __name__)


@services_bp.route("/api/services/nearby", methods=["GET"])
def get_nearby_services():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    category = request.args.get("category")
    radius = request.args.get("radius", default=50.0, type=float)

    if lat is None or lng is None:
        return jsonify({"error": "lat and lng query parameters are required"}), 400

    # Fetch active services that have coordinates
    query = (
        supabase.table("services")
        .select("*, users!provider_id(name, email, avatar_url)")
        .eq("is_active", True)
        .not_.is_("location_lat", "null")
        .not_.is_("location_lng", "null")
    )

    if category:
        query = query.eq("category", category)

    result = query.execute()

    # Flatten provider info
    services = []
    for s in result.data:
        provider = s.pop("users", None)
        if provider:
            s["provider_name"] = provider.get("name")
            s["provider_email"] = provider.get("email")
            s["provider_avatar"] = provider.get("avatar_url")
        services.append(s)

    # Run Dijkstra to rank by distance
    ranked = find_nearest_providers(lat, lng, services, top_n=len(services))

    # Filter by radius
    nearby = [s for s in ranked if s["distance_km"] <= radius]

    return jsonify(nearby), 200


@services_bp.route("/api/services", methods=["GET"])
def get_services():
    category = request.args.get("category")
    search = request.args.get("search")

    query = supabase.table("services").select("*, users!provider_id(name, email, avatar_url)")

    if category:
        query = query.eq("category", category)
    if search:
        query = query.ilike("title", f"%{search}%")

    query = query.eq("is_active", True)
    result = query.execute()

    # Flatten provider info
    services = []
    for s in result.data:
        provider = s.pop("users", None)
        if provider:
            s["provider_name"] = provider.get("name")
            s["provider_email"] = provider.get("email")
            s["provider_avatar"] = provider.get("avatar_url")
        services.append(s)

    return jsonify(services), 200


@services_bp.route("/api/services/<service_id>", methods=["GET"])
def get_service(service_id):
    result = (
        supabase.table("services")
        .select("*, users!provider_id(name, email, avatar_url)")
        .eq("id", service_id)
        .execute()
    )

    if not result.data:
        return jsonify({"error": "Service not found"}), 404

    service = result.data[0]
    provider = service.pop("users", None)
    if provider:
        service["provider_name"] = provider.get("name")
        service["provider_email"] = provider.get("email")
        service["provider_avatar"] = provider.get("avatar_url")

    return jsonify(service), 200


@services_bp.route("/api/services", methods=["POST"])
@token_required
def create_service():
    user = request.current_user
    if user["role"] != "provider":
        return jsonify({"error": "Only providers can create services"}), 403

    data = request.get_json()

    required = ["category", "title", "price"]
    if not all(data.get(f) for f in required):
        return jsonify({"error": "Category, title, and price are required"}), 400

    service_data = {
        "provider_id": user["id"],
        "category": data["category"],
        "title": data["title"],
        "description": data.get("description", ""),
        "price": float(data["price"]),
        "duration_estimate": data.get("duration_estimate", ""),
    }

    if data.get("location_lat") is not None:
        service_data["location_lat"] = float(data["location_lat"])
    if data.get("location_lng") is not None:
        service_data["location_lng"] = float(data["location_lng"])
    if data.get("location_address") is not None:
        service_data["location_address"] = data["location_address"]

    result = supabase.table("services").insert(service_data).execute()
    if not result.data:
        return jsonify({"error": "Failed to create service"}), 500

    return jsonify(result.data[0]), 201


@services_bp.route("/api/services/<service_id>", methods=["PUT"])
@token_required
def update_service(service_id):
    user = request.current_user
    if user["role"] != "provider":
        return jsonify({"error": "Only providers can update services"}), 403

    # Verify ownership
    existing = (
        supabase.table("services")
        .select("id, provider_id")
        .eq("id", service_id)
        .execute()
    )
    if not existing.data:
        return jsonify({"error": "Service not found"}), 404
    if existing.data[0]["provider_id"] != user["id"]:
        return jsonify({"error": "You can only update your own services"}), 403

    data = request.get_json()

    allowed = ["title", "category", "description", "price", "duration_estimate",
               "location_lat", "location_lng", "location_address", "is_active"]
    update_data = {}
    for k in allowed:
        if k in data:
            if k == "price":
                update_data[k] = float(data[k])
            elif k in ("location_lat", "location_lng") and data[k] is not None:
                update_data[k] = float(data[k])
            else:
                update_data[k] = data[k]

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    result = (
        supabase.table("services")
        .update(update_data)
        .eq("id", service_id)
        .execute()
    )
    if not result.data:
        return jsonify({"error": "Failed to update service"}), 500

    return jsonify(result.data[0]), 200


@services_bp.route("/api/services/<service_id>", methods=["DELETE"])
@token_required
def delete_service(service_id):
    user = request.current_user
    if user["role"] != "provider":
        return jsonify({"error": "Only providers can delete services"}), 403

    # Verify ownership
    existing = (
        supabase.table("services")
        .select("id, provider_id")
        .eq("id", service_id)
        .execute()
    )
    if not existing.data:
        return jsonify({"error": "Service not found"}), 404
    if existing.data[0]["provider_id"] != user["id"]:
        return jsonify({"error": "You can only delete your own services"}), 403

    supabase.table("services").delete().eq("id", service_id).execute()

    return jsonify({"message": "Service deleted"}), 200
