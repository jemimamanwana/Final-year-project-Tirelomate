from flask import Blueprint, request, jsonify
from models.supabase_client import supabase
from utils.auth_helpers import token_required

services_bp = Blueprint("services", __name__)


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

    result = supabase.table("services").insert(service_data).execute()
    if not result.data:
        return jsonify({"error": "Failed to create service"}), 500

    return jsonify(result.data[0]), 201
