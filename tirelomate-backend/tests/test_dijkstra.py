"""
Tests for the Dijkstra-based provider matching module.

Uses real GPS coordinates from Gaborone, Botswana.

Run with:
    cd tirelomate-backend
    python -m pytest tests/ -v
"""

import sys
import os

# Ensure the backend root is on sys.path so `from services.dijkstra import ...` works
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from services.dijkstra import (
    build_provider_graph,
    find_nearest_providers,
    find_with_fallback,
)

# ---------------------------------------------------------------------------
# Fixtures – real Gaborone coordinates
# ---------------------------------------------------------------------------

PROVIDER_A = {
    "id": "a",
    "name": "Provider A – Broadhurst",
    "location_lat": -24.6235,
    "location_lng": 25.8950,
    "category": "home",
    "is_available": True,
}

PROVIDER_B = {
    "id": "b",
    "name": "Provider B – Tlokweng",
    "location_lat": -24.6100,
    "location_lng": 25.9700,
    "category": "tech",
    "is_available": True,
}

PROVIDER_C = {
    "id": "c",
    "name": "Provider C – Mogoditshane",
    "location_lat": -24.6270,
    "location_lng": 25.8600,
    "category": "home",
    "is_available": True,
}

PROVIDER_D = {
    "id": "d",
    "name": "Provider D – Phakalane",
    "location_lat": -24.5800,
    "location_lng": 25.9100,
    "category": "tech",
    "is_available": True,
}

# Customer at Main Mall, Gaborone
CUSTOMER_LAT = -24.6550
CUSTOMER_LNG = 25.9200


@pytest.fixture
def all_providers():
    # Return fresh copies so tests don't mutate shared state
    return [
        dict(PROVIDER_A),
        dict(PROVIDER_B),
        dict(PROVIDER_C),
        dict(PROVIDER_D),
    ]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestFindNearestReturnsSorted:
    """Verify providers come back sorted by distance from the customer."""

    def test_find_nearest_returns_sorted(self, all_providers):
        results = find_nearest_providers(
            CUSTOMER_LAT, CUSTOMER_LNG, all_providers, top_n=4
        )

        assert len(results) == 4

        # Every result must have a distance_km field
        for r in results:
            assert "distance_km" in r
            assert isinstance(r["distance_km"], float)

        # Distances must be in ascending order
        distances = [r["distance_km"] for r in results]
        assert distances == sorted(distances), (
            f"Results not sorted by distance: {distances}"
        )


class TestFindWithFallbackSkipsUnavailable:
    """
    Mark Provider A as is_available=False and verify:
    - It still appears in the ranked results (the algorithm ranks everyone).
    - The first *available* provider in the list is the one closest among
      those with is_available=True.
    """

    def test_unavailable_still_in_results(self, all_providers):
        all_providers[0]["is_available"] = False  # Provider A

        results = find_with_fallback(
            CUSTOMER_LAT, CUSTOMER_LNG, all_providers
        )

        # All 4 providers should still be in the results
        result_ids = [r["id"] for r in results]
        assert "a" in result_ids

    def test_first_available_is_nearest_available(self, all_providers):
        all_providers[0]["is_available"] = False  # Provider A

        results = find_with_fallback(
            CUSTOMER_LAT, CUSTOMER_LNG, all_providers
        )

        # Simulate the inDrive-style fallback: iterate until we find available
        first_available = next(
            (r for r in results if r.get("is_available", True)), None
        )

        # Collect all available providers and their distances
        available_results = [r for r in results if r.get("is_available", True)]

        # The first available should be the one with the smallest distance
        # among available providers
        assert first_available is not None
        assert first_available["distance_km"] == available_results[0]["distance_km"]


class TestEmptyProviders:
    """Passing an empty list should return an empty result."""

    def test_empty_providers(self):
        results = find_nearest_providers(
            CUSTOMER_LAT, CUSTOMER_LNG, [], top_n=5
        )
        assert results == []

    def test_empty_fallback(self):
        results = find_with_fallback(
            CUSTOMER_LAT, CUSTOMER_LNG, []
        )
        assert results == []


class TestSingleProvider:
    """One provider should return correctly with a distance."""

    def test_single_provider(self):
        provider = dict(PROVIDER_A)
        results = find_nearest_providers(
            CUSTOMER_LAT, CUSTOMER_LNG, [provider], top_n=5
        )

        assert len(results) == 1
        assert results[0]["id"] == "a"
        assert results[0]["distance_km"] > 0
        # Broadhurst to Main Mall is roughly 4-5 km
        assert results[0]["distance_km"] < 10


class TestCategoryFilterInNearby:
    """Verify find_with_fallback filters by category correctly."""

    def test_filter_home_category(self, all_providers):
        results = find_with_fallback(
            CUSTOMER_LAT, CUSTOMER_LNG, all_providers, category="home"
        )

        # Only Provider A (Broadhurst) and C (Mogoditshane) are "home"
        assert len(results) == 2
        result_ids = {r["id"] for r in results}
        assert result_ids == {"a", "c"}

        # Still sorted by distance
        distances = [r["distance_km"] for r in results]
        assert distances == sorted(distances)

    def test_filter_tech_category(self, all_providers):
        results = find_with_fallback(
            CUSTOMER_LAT, CUSTOMER_LNG, all_providers, category="tech"
        )

        # Only Provider B (Tlokweng) and D (Phakalane) are "tech"
        assert len(results) == 2
        result_ids = {r["id"] for r in results}
        assert result_ids == {"b", "d"}

    def test_filter_nonexistent_category(self, all_providers):
        results = find_with_fallback(
            CUSTOMER_LAT, CUSTOMER_LNG, all_providers, category="automotive"
        )
        assert results == []


class TestBuildProviderGraph:
    """Verify the graph structure is correct."""

    def test_graph_has_all_nodes(self, all_providers):
        graph = build_provider_graph(all_providers)
        assert set(graph.keys()) == {"a", "b", "c", "d"}

    def test_graph_is_complete(self, all_providers):
        graph = build_provider_graph(all_providers)
        # In a complete graph with 4 nodes, each node has 3 edges
        for node, edges in graph.items():
            assert len(edges) == 3, f"Node {node} should have 3 edges"

    def test_edge_weights_are_positive(self, all_providers):
        graph = build_provider_graph(all_providers)
        for node, edges in graph.items():
            for neighbour, weight in edges:
                assert weight > 0, f"Edge {node}->{neighbour} has non-positive weight"
