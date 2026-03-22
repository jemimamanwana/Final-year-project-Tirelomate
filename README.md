# TireloMate

A service marketplace platform connecting customers with local service providers in Botswana. Features location-based provider matching using Dijkstra's shortest-path algorithm, real-time messaging, an inDrive-style booking flow, and simulated payments.

## Tech Stack

- **Backend:** Python / Flask, Supabase (PostgreSQL + Auth)
- **Frontend:** Vanilla JS, HTML/CSS
- **Maps:** Leaflet.js + OpenStreetMap
- **Algorithms:** Dijkstra's shortest path (custom heapq implementation) for nearest-provider matching
- **Auth:** JWT tokens with bcrypt password hashing

## Supabase Tables

Create these tables in your Supabase dashboard before running.

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| name | text | |
| email | text | unique |
| password_hash | text | |
| role | text | `customer` or `provider` |
| phone | text | nullable |
| avatar_url | text | nullable |
| location_lat | float8 | nullable |
| location_lng | float8 | nullable |
| created_at | timestamptz | default `now()` |

### services
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| provider_id | uuid | FK -> users.id |
| category | text | |
| title | text | |
| description | text | |
| price | numeric | |
| duration_estimate | text | nullable |
| location_lat | float8 | nullable |
| location_lng | float8 | nullable |
| location_address | text | nullable |
| is_active | boolean | default `true` |
| created_at | timestamptz | default `now()` |

### bookings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| customer_id | uuid | FK -> users.id |
| provider_id | uuid | FK -> users.id |
| service_id | uuid | FK -> services.id |
| date | date | |
| time | text | |
| status | text | default `pending` (`pending`, `confirmed`, `completed`, `cancelled`) |
| total_price | numeric | nullable |
| notes | text | |
| created_at | timestamptz | default `now()` |

### reviews
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| customer_id | uuid | FK -> users.id |
| provider_id | uuid | FK -> users.id |
| booking_id | uuid | FK -> bookings.id, nullable |
| rating | int4 | 1-5 |
| comment | text | |
| created_at | timestamptz | default `now()` |

### messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| sender_id | uuid | FK -> users.id |
| receiver_id | uuid | FK -> users.id |
| booking_id | uuid | FK -> bookings.id, nullable |
| content | text | |
| created_at | timestamptz | default `now()` |

### payments
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| booking_id | uuid | FK -> bookings.id |
| customer_id | uuid | FK -> users.id |
| provider_id | uuid | FK -> users.id |
| amount | numeric | |
| payment_method | text | `cash`, `mobile_money`, `card_simulation` |
| status | text | default `completed` |
| transaction_ref | text | e.g. `TM-A1B2C3D4` |
| created_at | timestamptz | default `now()` |

## Running Locally

```bash
# 1. Clone the repo
git clone <repo-url>
cd Hackerthon2025-Changes1pinkinterface

# 2. Set up backend
cd tirelomate-backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials and JWT secret

# 4. Create tables in Supabase dashboard (see table schemas above)

# 5. Run the backend
flask run --port 5000

# 6. Open the frontend
# Open index.html in your browser (or use Live Server in VS Code)
```

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |

### User
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/me` | Yes | Get current user profile |
| PUT | `/api/user/<id>` | Yes | Update own profile |

### Services
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/services` | No | List active services (filter by category, search) |
| GET | `/api/services/nearby` | No | Dijkstra-ranked services by distance (`lat`, `lng`, `category`, `radius`) |
| GET | `/api/services/<id>` | No | Get single service |
| POST | `/api/services` | Yes | Create service (providers only) |

### Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bookings` | Yes | Customer's bookings |
| POST | `/api/bookings` | Yes | Create booking (auto-lookups provider_id if omitted) |
| PUT | `/api/bookings/<id>` | Yes | Update booking status |

### Provider
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/provider/bookings` | Yes | Provider's bookings (filter by `status`) |
| GET | `/api/provider/services` | Yes | Provider's services |
| PUT | `/api/provider/booking/<id>` | Yes | Update provider's booking status |

### Reviews
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/services/<id>/reviews` | No | Reviews for a service's provider |
| POST | `/api/services/<id>/reviews` | Yes | Submit review (duplicate check via booking_id) |
| GET | `/api/provider/<id>/rating` | No | Average rating + count |
| GET | `/api/provider/<id>/reviews` | No | All reviews for provider |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/messages/conversations` | Yes | List conversations with last message |
| GET | `/api/messages?with=<user_id>` | Yes | Message thread with a user |
| POST | `/api/messages` | Yes | Send message (`receiver_id`, `content`, optional `booking_id`) |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments` | Yes | Create payment (`booking_id`, `amount`, `payment_method`) |
| GET | `/api/payments` | Yes | List user's payments |

## Dijkstra Algorithm

The `tirelomate-backend/services/dijkstra.py` module implements provider matching:

1. **`build_provider_graph(providers)`** - Builds a complete graph with haversine-distance edges
2. **`find_nearest_providers(lat, lng, providers, top_n)`** - Adds customer as temporary node, runs Dijkstra from it
3. **`find_with_fallback(lat, lng, providers, category)`** - inDrive-style: returns all providers sorted by distance for cascading attempts

Tests: `cd tirelomate-backend && python -m pytest tests/ -v`
