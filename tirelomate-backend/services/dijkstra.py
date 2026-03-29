"""
Dijkstra's shortest-path algorithm for finding nearest service providers.

Uses the Haversine formula for edge weights (great-circle distance in km)
and a min-heap (heapq) priority queue for the shortest-path computation.
No external graph libraries (e.g. networkx) are used.
"""

import heapq
from utils.helpers import calculate_distance


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def build_provider_graph(providers):
    """
    Build a complete adjacency-list graph from a list of provider dicts.

    Each provider dict must contain at least:
        - id           : unique identifier
        - location_lat : latitude  (float)
        - location_lng : longitude (float)

    Returns:
        dict[str, list[tuple[str, float]]]
            Adjacency list mapping each provider id (str) to a list of
            (neighbour_id, distance_km) tuples.  Every pair of providers
            is connected, making this a complete graph.
    """
    graph = {str(p["id"]): [] for p in providers}

    for i, a in enumerate(providers):
        for b in providers[i + 1:]:
            dist = calculate_distance(
                a["location_lat"], a["location_lng"],
                b["location_lat"], b["location_lng"],
            )
            aid, bid = str(a["id"]), str(b["id"])
            graph[aid].append((bid, dist))
            graph[bid].append((aid, dist))

    return graph


# ---------------------------------------------------------------------------
# Dijkstra's algorithm
# ---------------------------------------------------------------------------

def _dijkstra(graph, source):
    """
    Classic Dijkstra's shortest-path algorithm using a min-heap.

    Algorithm overview:
        1. Initialise every node's tentative distance to infinity, except
           the source which starts at 0.
        2. Push the source into a min-heap keyed by distance.
        3. Pop the node with the smallest tentative distance.
        4. For each neighbour, check if travelling *through* the current
           node yields a shorter path than the neighbour's current best.
           If so, update the neighbour's distance and push it onto the heap.
        5. Repeat until the heap is empty.

    Because we use a binary heap the time complexity is O((V + E) log V).

    Args:
        graph  : dict[str, list[tuple[str, float]]]  – adjacency list
        source : str – starting node id

    Returns:
        dict[str, float] – shortest distance from source to every reachable node
    """
    distances = {node: float("inf") for node in graph}
    distances[source] = 0.0

    # Min-heap entries: (distance, node_id)
    heap = [(0.0, source)]

    visited = set()

    while heap:
        current_dist, current_node = heapq.heappop(heap)

        if current_node in visited:
            continue
        visited.add(current_node)

        for neighbour, weight in graph[current_node]:
            new_dist = current_dist + weight
            if new_dist < distances[neighbour]:
                distances[neighbour] = new_dist
                heapq.heappush(heap, (new_dist, neighbour))

    return distances


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def find_nearest_providers(customer_lat, customer_lng, providers, top_n=5):
    """
    Find the *top_n* nearest providers to a customer location using
    Dijkstra's algorithm.

    How it works:
        1. Build a complete provider graph.
        2. Add the customer as a temporary node ("__customer__") connected
           to every provider with edge weight = haversine distance.
        3. Run Dijkstra from the customer node.
        4. Return the *top_n* providers sorted by ascending distance.

    Args:
        customer_lat : float – customer latitude
        customer_lng : float – customer longitude
        providers    : list[dict] – provider dicts with id, location_lat, location_lng
        top_n        : int – how many results to return (default 5)

    Returns:
        list[dict] – each dict is a copy of the provider dict with an added
                     ``distance_km`` field (rounded to 2 decimal places).
    """
    if not providers:
        return []

    # Filter out providers that lack coordinates
    valid = [p for p in providers if p.get("location_lat") and p.get("location_lng")]
    if not valid:
        return []

    # Build graph and inject a temporary customer node
    graph = build_provider_graph(valid)
    customer_id = "__customer__"
    graph[customer_id] = []

    for p in valid:
        dist = calculate_distance(
            customer_lat, customer_lng,
            p["location_lat"], p["location_lng"],
        )
        pid = str(p["id"])
        graph[customer_id].append((pid, dist))
        graph[pid].append((customer_id, dist))

    # Run Dijkstra from the customer node
    distances = _dijkstra(graph, customer_id)

    # Build the results list (exclude the customer node itself)
    provider_map = {str(p["id"]): p for p in valid}
    results = []
    for pid, p in provider_map.items():
        results.append({
            **p,
            "distance_km": round(distances.get(pid, float("inf")), 2),
        })

    results.sort(key=lambda x: x["distance_km"])
    return results[:top_n]


def find_with_fallback(customer_lat, customer_lng, providers, category=None):
    """
    Return *all* matching providers sorted by distance (nearest first).

    This implements the inDrive-style cascading logic: the caller iterates
    through the returned list and contacts the first provider.  If that
    provider is unavailable or declines, the caller moves on to the second,
    and so on.

    Args:
        customer_lat : float – customer latitude
        customer_lng : float – customer longitude
        providers    : list[dict] – provider dicts
        category     : str | None – if provided, only include providers
                       whose ``category`` field matches (case-insensitive)

    Returns:
        list[dict] – provider dicts with ``distance_km``, sorted ascending.
    """
    pool = providers
    if category:
        cat_lower = category.lower()
        pool = [p for p in pool if str(p.get("category", "")).lower() == cat_lower]

    # Reuse find_nearest_providers with top_n = all
    return find_nearest_providers(
        customer_lat, customer_lng, pool, top_n=len(pool)
    )
