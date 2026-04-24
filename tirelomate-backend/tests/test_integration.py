"""
Integration tests for the full TireloMate user flow.

Mocks the Supabase client so no real database is needed.
Run with:  python -m pytest tests/test_integration.py -v
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Deterministic IDs used across the whole flow
# ---------------------------------------------------------------------------
PROVIDER_ID = str(uuid.uuid4())
CUSTOMER_ID = str(uuid.uuid4())
SERVICE_ID = str(uuid.uuid4())
BOOKING_ID = str(uuid.uuid4())
REVIEW_ID = str(uuid.uuid4())


# ---------------------------------------------------------------------------
# In-memory "database" shared by all mock calls
# ---------------------------------------------------------------------------
class FakeDB:
    """Simple in-memory store that the mock Supabase chains write to / read from."""

    def __init__(self):
        self.users = []
        self.services = []
        self.bookings = []
        self.reviews = []
        self.provider_profiles = []


# ---------------------------------------------------------------------------
# Supabase query-builder mock
# ---------------------------------------------------------------------------
class FakeQueryBuilder:
    """Mimics the Supabase chained query API (select / insert / update / eq / …)."""

    def __init__(self, db: FakeDB, table_name: str):
        self._db = db
        self._table = table_name
        self._rows = self._get_rows()
        self._filters = []
        self._op = None  # "select", "insert", "update"
        self._select_cols = "*"
        self._insert_data = None
        self._update_data = None
        self._order_col = None
        self._order_desc = False
        self._in_filters = []

    # -- helpers --
    def _get_rows(self):
        return getattr(self._db, self._table, [])

    def _set_rows(self, rows):
        setattr(self._db, self._table, rows)

    # -- chain methods (return self for fluent API) --
    def select(self, cols="*"):
        self._op = "select"
        self._select_cols = cols
        return self

    def insert(self, data):
        self._op = "insert"
        self._insert_data = data
        return self

    def update(self, data):
        self._op = "update"
        self._update_data = data
        return self

    def eq(self, col, val):
        self._filters.append(("eq", col, val))
        return self

    def ilike(self, col, pattern):
        self._filters.append(("ilike", col, pattern))
        return self

    def in_(self, col, values):
        self._in_filters.append((col, values))
        return self

    def order(self, col, desc=False):
        self._order_col = col
        self._order_desc = desc
        return self

    # Supabase not_.is_ for null checks
    @property
    def not_(self):
        return self

    def is_(self, col, val):
        self._filters.append(("not_is", col, val))
        return self

    # -- execute: resolve the chain --
    def execute(self):
        result = MagicMock()

        if self._op == "insert":
            row = dict(self._insert_data)
            # Auto-generate id and created_at if missing
            if "id" not in row:
                # Use deterministic IDs based on table
                if self._table == "users":
                    role = row.get("role", "customer")
                    row["id"] = PROVIDER_ID if role == "provider" else CUSTOMER_ID
                elif self._table == "services":
                    row["id"] = SERVICE_ID
                elif self._table == "bookings":
                    row["id"] = BOOKING_ID
                elif self._table == "reviews":
                    row["id"] = REVIEW_ID
                else:
                    row["id"] = str(uuid.uuid4())
            if "created_at" not in row:
                row["created_at"] = "2026-03-15T00:00:00+00:00"
            if self._table == "services" and "is_active" not in row:
                row["is_active"] = True
            if self._table == "bookings" and "status" not in row:
                row["status"] = "pending"
            rows = self._get_rows()
            rows.append(row)
            self._set_rows(rows)
            result.data = [row]
            return result

        if self._op == "update":
            rows = self._apply_filters(self._get_rows())
            updated = []
            for row in rows:
                row.update(self._update_data)
                updated.append(row)
            result.data = updated
            return result

        # select
        rows = self._apply_filters(self._get_rows())

        # Apply in_ filters
        for col, values in self._in_filters:
            rows = [r for r in rows if r.get(col) in values]

        # Inline join simulation for select columns containing "!"
        # e.g. "*, users!provider_id(name, email, avatar_url)"
        if self._select_cols and "!" in self._select_cols:
            for row in rows:
                row = self._simulate_join(row)

        if self._order_col:
            rows = sorted(
                rows,
                key=lambda r: r.get(self._order_col, ""),
                reverse=self._order_desc,
            )

        result.data = [dict(r) for r in rows]
        return result

    def _apply_filters(self, rows):
        filtered = list(rows)
        for kind, col, val in self._filters:
            if kind == "eq":
                filtered = [r for r in filtered if str(r.get(col)) == str(val)]
            elif kind == "ilike":
                pattern = val.strip("%").lower()
                filtered = [r for r in filtered if pattern in str(r.get(col, "")).lower()]
            elif kind == "not_is":
                # not_.is_(col, "null") → keep rows where col is not None
                filtered = [r for r in filtered if r.get(col) is not None]
        return filtered

    def _simulate_join(self, row):
        """Very simple join simulation: adds a 'users' key with data from the users table."""
        # Look for FK patterns like users!provider_id or users!customer_id
        for fk_col in ("provider_id", "customer_id"):
            fk_val = row.get(fk_col)
            if fk_val:
                for u in self._db.users:
                    if str(u["id"]) == str(fk_val):
                        row["users"] = {
                            "name": u.get("name"),
                            "email": u.get("email"),
                            "avatar_url": u.get("avatar_url"),
                        }
                        break
        return row


class FakeSupabase:
    """Top-level mock that replaces `models.supabase_client.supabase`."""

    def __init__(self, db: FakeDB):
        self._db = db

    def table(self, name):
        return FakeQueryBuilder(self._db, name)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def fake_db():
    return FakeDB()


@pytest.fixture()
def app(fake_db):
    """Create a Flask test app with Supabase mocked out."""
    fake_supa = FakeSupabase(fake_db)

    # Patch every module that imports supabase at module level
    mock_send_created = MagicMock(return_value=True)
    mock_send_confirmed = MagicMock(return_value=True)

    patches = [
        patch("models.supabase_client.supabase", fake_supa),
        patch("routes.auth.supabase", fake_supa),
        patch("routes.user.supabase", fake_supa),
        patch("routes.services.supabase", fake_supa),
        patch("routes.bookings.supabase", fake_supa),
        patch("routes.provider.supabase", fake_supa),
        patch("routes.reviews.supabase", fake_supa),
        patch("routes.messages.supabase", fake_supa),
        patch("routes.payments.supabase", fake_supa),
        patch("services.email_service.send_booking_created_email", mock_send_created),
        patch("services.email_service.send_booking_confirmed_email", mock_send_confirmed),
    ]
    for p in patches:
        p.start()

    from app import create_app

    flask_app = create_app()
    flask_app.config["TESTING"] = True
    flask_app._mock_send_created = mock_send_created
    flask_app._mock_send_confirmed = mock_send_confirmed

    yield flask_app

    for p in patches:
        p.stop()


@pytest.fixture()
def client(app):
    return app.test_client()


# ---------------------------------------------------------------------------
# Helper to build an Authorization header from a token string
# ---------------------------------------------------------------------------
def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# Tests — executed in order, each building on the previous step
# ---------------------------------------------------------------------------

class TestFullUserFlow:
    """End-to-end flow: register → create service → nearby → book → confirm → review."""

    # ---- Step 1: Register a provider ----
    def test_01_register_provider(self, client, fake_db):
        resp = client.post("/api/register", json={
            "name": "Test Provider",
            "email": "provider@test.com",
            "password": "test123",
            "user_type": "provider",
        })

        assert resp.status_code == 201
        data = resp.get_json()
        assert "token" in data
        assert data["user_type"] == "provider"
        assert data["message"] == "Registration successful"

        # Verify user landed in our fake DB
        assert len(fake_db.users) == 1
        assert fake_db.users[0]["name"] == "Test Provider"
        assert fake_db.users[0]["role"] == "provider"
        assert fake_db.users[0]["id"] == PROVIDER_ID

        # Provider profile should also have been created
        assert len(fake_db.provider_profiles) == 1

    # ---- Step 2: Create a service as the provider ----
    def test_02_create_service(self, client, fake_db):
        # First register the provider to populate the DB
        client.post("/api/register", json={
            "name": "Test Provider",
            "email": "provider@test.com",
            "password": "test123",
            "user_type": "provider",
        })

        # Build a real token for the provider
        from utils.auth_helpers import create_token
        token = create_token(PROVIDER_ID, role="provider")

        resp = client.post("/api/services", json={
            "title": "Test Cleaning",
            "category": "home",
            "price": 100,
            "description": "Professional cleaning service",
            "location_lat": -24.6235,
            "location_lng": 25.8950,
        }, headers=auth_header(token))

        assert resp.status_code == 201
        svc = resp.get_json()
        assert svc["title"] == "Test Cleaning"
        assert svc["category"] == "home"
        assert svc["price"] == 100
        assert svc["location_lat"] == -24.6235
        assert svc["location_lng"] == 25.8950
        assert svc["provider_id"] == PROVIDER_ID
        assert svc["id"] == SERVICE_ID

    # ---- Step 3: Register a customer ----
    def test_03_register_customer(self, client, fake_db):
        resp = client.post("/api/register", json={
            "name": "Test Customer",
            "email": "customer@test.com",
            "password": "test123",
            "user_type": "customer",
        })

        assert resp.status_code == 201
        data = resp.get_json()
        assert "token" in data
        assert data["user_type"] == "customer"

        # Should be in the DB
        customers = [u for u in fake_db.users if u["role"] == "customer"]
        assert len(customers) == 1
        assert customers[0]["id"] == CUSTOMER_ID

    # ---- Step 4: GET /api/services/nearby and verify distance_km is populated ----
    def test_04_nearby_services(self, client, fake_db):
        # Set up DB state: provider + service
        fake_db.users.append({
            "id": PROVIDER_ID,
            "name": "Test Provider",
            "email": "provider@test.com",
            "role": "provider",
            "avatar_url": None,
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.services.append({
            "id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "title": "Test Cleaning",
            "category": "home",
            "price": 100,
            "description": "Professional cleaning service",
            "location_lat": -24.6235,
            "location_lng": 25.8950,
            "location_address": None,
            "is_active": True,
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        resp = client.get("/api/services/nearby?lat=-24.6550&lng=25.9200")

        assert resp.status_code == 200
        services = resp.get_json()
        assert isinstance(services, list)
        assert len(services) >= 1

        svc = services[0]
        assert svc["title"] == "Test Cleaning"
        assert "distance_km" in svc
        assert isinstance(svc["distance_km"], (int, float))
        assert svc["distance_km"] > 0  # Customer is ~4 km from provider

    # ---- Step 5: Book the service as a customer ----
    def test_05_create_booking(self, client, fake_db, app):
        # Set up DB state
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "Test Customer",
            "email": "customer@test.com",
            "role": "customer",
            "avatar_url": None,
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.users.append({
            "id": PROVIDER_ID,
            "name": "Test Provider",
            "email": "provider@test.com",
            "role": "provider",
            "avatar_url": None,
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.services.append({
            "id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "title": "Test Cleaning",
            "category": "home",
            "price": 100,
            "is_active": True,
            "location_lat": -24.6235,
            "location_lng": 25.8950,
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        app._mock_send_created.reset_mock()

        from utils.auth_helpers import create_token
        token = create_token(CUSTOMER_ID, role="customer")

        resp = client.post("/api/bookings", json={
            "service_id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "date": "2026-03-20",
            "time": "10:00",
            "notes": "Please bring supplies",
        }, headers=auth_header(token))

        assert resp.status_code == 201
        booking = resp.get_json()
        assert booking["id"] == BOOKING_ID
        assert booking["service_id"] == SERVICE_ID
        assert booking["provider_id"] == PROVIDER_ID
        assert booking["customer_id"] == CUSTOMER_ID
        assert booking["status"] == "pending"
        assert booking["date"] == "2026-03-20"
        assert booking["time"] == "10:00"

        # Verify email notification was triggered
        app._mock_send_created.assert_called_once()
        call_kwargs = app._mock_send_created.call_args
        args = call_kwargs.kwargs if call_kwargs.kwargs else {}
        if not args:
            args = dict(zip(
                ["provider_email", "provider_name", "customer_name",
                 "service_title", "booking_date", "booking_time", "notes", "booking_id"],
                call_kwargs.args,
            ))
        assert args["provider_email"] == "provider@test.com"
        assert args["customer_name"] == "Test Customer"
        assert args["service_title"] == "Test Cleaning"

    # ---- Step 6: Provider confirms the booking ----
    def test_06_provider_confirms_booking(self, client, fake_db, app):
        # Set up DB state
        fake_db.users.append({
            "id": PROVIDER_ID,
            "name": "Test Provider",
            "email": "provider@test.com",
            "role": "provider",
            "avatar_url": None,
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "Test Customer",
            "email": "customer@test.com",
            "role": "customer",
            "avatar_url": None,
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.bookings.append({
            "id": BOOKING_ID,
            "customer_id": CUSTOMER_ID,
            "provider_id": PROVIDER_ID,
            "service_id": SERVICE_ID,
            "date": "2026-03-20",
            "time": "10:00",
            "status": "pending",
            "notes": "Please bring supplies",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.services.append({
            "id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "title": "Test Cleaning",
            "category": "home",
            "price": 100,
            "is_active": True,
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        app._mock_send_confirmed.reset_mock()

        from utils.auth_helpers import create_token
        token = create_token(PROVIDER_ID, role="provider")

        resp = client.put(
            f"/api/provider/booking/{BOOKING_ID}",
            json={"status": "confirmed"},
            headers=auth_header(token),
        )

        assert resp.status_code == 200
        booking = resp.get_json()
        assert booking["id"] == BOOKING_ID
        assert booking["status"] == "confirmed"

        # Verify email notification was triggered
        app._mock_send_confirmed.assert_called_once()
        call_kwargs = app._mock_send_confirmed.call_args
        args = call_kwargs.kwargs if call_kwargs.kwargs else {}
        if not args:
            args = dict(zip(
                ["customer_email", "customer_name", "provider_name",
                 "service_title", "booking_date", "booking_time", "booking_id"],
                call_kwargs.args,
            ))
        assert args["customer_email"] == "customer@test.com"
        assert args["provider_name"] == "Test Provider"
        assert args["service_title"] == "Test Cleaning"

    # ---- Step 7: Customer leaves a 5-star review ----
    def test_07_create_review(self, client, fake_db):
        # Set up DB state
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "Test Customer",
            "email": "customer@test.com",
            "role": "customer",
            "avatar_url": None,
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.services.append({
            "id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "title": "Test Cleaning",
            "category": "home",
            "price": 100,
            "is_active": True,
            "location_lat": -24.6235,
            "location_lng": 25.8950,
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        from utils.auth_helpers import create_token
        token = create_token(CUSTOMER_ID, role="customer")

        resp = client.post(
            f"/api/services/{SERVICE_ID}/reviews",
            json={
                "rating": 5,
                "comment": "Excellent cleaning service! Highly recommended.",
                "booking_id": BOOKING_ID,
            },
            headers=auth_header(token),
        )

        assert resp.status_code == 201
        review = resp.get_json()
        assert review["rating"] == 5
        assert review["comment"] == "Excellent cleaning service! Highly recommended."
        assert review["customer_id"] == CUSTOMER_ID
        assert review["provider_id"] == PROVIDER_ID
        assert review["booking_id"] == BOOKING_ID

    # ---- Step 8: GET reviews and verify the review exists ----
    def test_08_get_reviews(self, client, fake_db):
        # Set up DB state: service + review + customer user (for join)
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "Test Customer",
            "email": "customer@test.com",
            "role": "customer",
            "avatar_url": None,
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.services.append({
            "id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "title": "Test Cleaning",
            "category": "home",
            "price": 100,
            "is_active": True,
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.reviews.append({
            "id": REVIEW_ID,
            "customer_id": CUSTOMER_ID,
            "provider_id": PROVIDER_ID,
            "booking_id": BOOKING_ID,
            "rating": 5,
            "comment": "Excellent cleaning service! Highly recommended.",
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        resp = client.get(f"/api/services/{SERVICE_ID}/reviews")

        assert resp.status_code == 200
        reviews = resp.get_json()
        assert isinstance(reviews, list)
        assert len(reviews) >= 1

        review = reviews[0]
        assert review["rating"] == 5
        assert review["comment"] == "Excellent cleaning service! Highly recommended."
        assert review["provider_id"] == PROVIDER_ID
        assert review["customer_id"] == CUSTOMER_ID


# ---------------------------------------------------------------------------
# Additional edge-case tests
# ---------------------------------------------------------------------------

class TestEdgeCases:
    """Verify validation and error responses."""

    def test_register_missing_fields(self, client):
        resp = client.post("/api/register", json={"name": "Test"})
        assert resp.status_code == 400
        assert "required" in resp.get_json()["error"].lower()

    def test_register_invalid_user_type(self, client):
        resp = client.post("/api/register", json={
            "name": "X",
            "email": "x@x.com",
            "password": "pw",
            "user_type": "admin",
        })
        assert resp.status_code == 400
        assert "invalid" in resp.get_json()["error"].lower()

    def test_create_service_requires_auth(self, client):
        resp = client.post("/api/services", json={
            "title": "X",
            "category": "home",
            "price": 10,
        })
        assert resp.status_code == 401

    def test_create_booking_requires_fields(self, client, fake_db):
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "C",
            "email": "c@c.com",
            "role": "customer",
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        from utils.auth_helpers import create_token
        token = create_token(CUSTOMER_ID)

        resp = client.post("/api/bookings", json={
            "service_id": SERVICE_ID,
        }, headers=auth_header(token))

        assert resp.status_code == 400
        assert "required" in resp.get_json()["error"].lower()

    def test_nearby_requires_lat_lng(self, client):
        resp = client.get("/api/services/nearby")
        assert resp.status_code == 400

    def test_review_rating_validation(self, client, fake_db):
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "C",
            "email": "c@c.com",
            "role": "customer",
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.services.append({
            "id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "is_active": True,
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        from utils.auth_helpers import create_token
        token = create_token(CUSTOMER_ID)

        # Rating of 0 should fail
        resp = client.post(
            f"/api/services/{SERVICE_ID}/reviews",
            json={"rating": 0, "comment": "bad"},
            headers=auth_header(token),
        )
        assert resp.status_code == 400

    def test_duplicate_review_blocked(self, client, fake_db):
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "C",
            "email": "c@c.com",
            "role": "customer",
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        fake_db.services.append({
            "id": SERVICE_ID,
            "provider_id": PROVIDER_ID,
            "is_active": True,
            "created_at": "2026-03-15T00:00:00+00:00",
        })
        # Pre-existing review for this booking
        fake_db.reviews.append({
            "id": REVIEW_ID,
            "customer_id": CUSTOMER_ID,
            "provider_id": PROVIDER_ID,
            "booking_id": BOOKING_ID,
            "rating": 5,
            "comment": "Already reviewed",
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        from utils.auth_helpers import create_token
        token = create_token(CUSTOMER_ID)

        resp = client.post(
            f"/api/services/{SERVICE_ID}/reviews",
            json={"rating": 4, "comment": "Again", "booking_id": BOOKING_ID},
            headers=auth_header(token),
        )
        assert resp.status_code == 400
        assert "already reviewed" in resp.get_json()["error"].lower()

    def test_provider_booking_confirm_invalid_status(self, client, fake_db):
        fake_db.users.append({
            "id": PROVIDER_ID,
            "name": "P",
            "email": "p@p.com",
            "role": "provider",
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        from utils.auth_helpers import create_token
        token = create_token(PROVIDER_ID)

        resp = client.put(
            f"/api/provider/booking/{BOOKING_ID}",
            json={"status": "invalid_status"},
            headers=auth_header(token),
        )
        assert resp.status_code == 400

    def test_only_providers_create_services(self, client, fake_db):
        """A customer should get 403 when trying to create a service."""
        fake_db.users.append({
            "id": CUSTOMER_ID,
            "name": "C",
            "email": "c@c.com",
            "role": "customer",
            "password_hash": "x",
            "created_at": "2026-03-15T00:00:00+00:00",
        })

        from utils.auth_helpers import create_token
        token = create_token(CUSTOMER_ID)

        resp = client.post("/api/services", json={
            "title": "X",
            "category": "home",
            "price": 10,
        }, headers=auth_header(token))

        assert resp.status_code == 403
