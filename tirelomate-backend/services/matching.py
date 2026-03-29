from services.dijkstra import find_with_fallback


def match_providers(service, location, top_n=5):
    """
    Match service providers to a customer request using location-based ranking.

    Uses Dijkstra's algorithm via find_with_fallback to return providers
    sorted by distance (inDrive-style: try nearest first, fall back to next).

    Args:
        service   : dict with 'category' and a list of candidate 'providers'
                    (each provider must have id, location_lat, location_lng)
        location  : dict with 'lat' and 'lng' for the customer's position
        top_n     : int – max number of matches to return (default 5)

    Returns:
        dict with 'matches' (list of provider dicts with distance_km) and
        'message' describing the result.
    """
    providers = service.get("providers", [])
    category = service.get("category")
    lat = location.get("lat")
    lng = location.get("lng")

    if not lat or not lng:
        return {"matches": [], "message": "Customer location is required"}

    if not providers:
        return {"matches": [], "message": "No providers available"}

    ranked = find_with_fallback(lat, lng, providers, category=category)
    matches = ranked[:top_n]

    return {
        "matches": matches,
        "message": f"Found {len(matches)} provider(s) sorted by distance",
    }
