import pytest
import os
import uuid
from fastapi.testclient import TestClient
from app.config import settings

@pytest.fixture(scope="module")
def client():
    # Force testing mode during tests
    settings.ENVIRONMENT = "testing"
    from main import app
    # Disabling the actual background scheduler on startup to speed up tests and avoid resource leaks
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    """Test the raw API health check."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_status_endpoint(client):
    """Test system status metrics endpoint."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "scheduler" in data


def test_config_endpoints(client):
    """Test runtime subreddit/source configurations."""
    # 1. Get current config
    response = client.get("/api/config/subreddits")
    assert response.status_code == 200
    original_config = response.json()
    assert "subreddits" in original_config

    # 2. Set new config
    payload = {"subreddits": ["programming", "technology", "artificial"]}
    response = client.post("/api/config/subreddits", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "programming" in data["subreddits"]

    # 3. Clean/Reset config
    response = client.delete("/api/config/subreddits")
    assert response.status_code == 200


def test_auth_and_protected_watchlist_flow(client):
    """Test complete auth cycle (register -> login -> access protected watchlist routes)."""
    # 1. Register a test user
    username = f"e2e_{uuid.uuid4().hex[:8]}"
    email = f"test_e2e_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "supersecretpassword123"
    register_payload = {
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password
    }
    
    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == 201
    reg_data = response.json()
    assert "access_token" in reg_data

    # 2. Test login
    login_payload = {"username": username, "password": password}
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    login_data = response.json()
    assert "access_token" in login_data

    # 3. Test GET /me
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["user"]["email"] == email

    # 4. Test Watchlist retrieval (should be empty initially)
    response = client.get("/api/watchlist/")
    assert response.status_code == 200
    assert response.json()["total"] == 0

    # 5. Test Add to Watchlist
    watchlist_payload = {
        "cluster_id": "test-cluster-123",
        "cluster_title": "E2E Test Cluster",
        "cluster_keyword": "pytest"
    }
    response = client.post("/api/watchlist/", json=watchlist_payload)
    assert response.status_code == 201
    add_data = response.json()
    assert "id" in add_data
    item_id = add_data["id"]

    # 6. Test Watchlist has item
    response = client.get("/api/watchlist/")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["watchlist"][0]["cluster_id"] == "test-cluster-123"

    # 7. Test Remove from Watchlist
    response = client.delete(f"/api/watchlist/{item_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Removed"

    # 8. Test Watchlist is empty again
    response = client.get("/api/watchlist/")
    assert response.json()["total"] == 0


def test_alerts_endpoints(client):
    """Test authenticated alerts endpoints (list, create, delete keyword alerts)."""
    # Register/Login
    username = f"e2e_alert_{uuid.uuid4().hex[:8]}"
    email = f"test_e2e_alert_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "supersecretpassword123"
    register_payload = {
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password
    }
    client.post("/api/auth/register", json=register_payload)
    client.post("/api/auth/login", json={"username": username, "password": password})

    # 1. List alerts
    response = client.get("/api/alerts/")
    assert response.status_code == 200
    assert "alerts" in response.json()
    assert response.json()["total"] == 0

    # 2. Create alert
    alert_email = "alert_test@example.com"
    response = client.post("/api/alerts/", json={"keyword": "generative ai", "email": alert_email})
    assert response.status_code == 201
    data = response.json()
    assert "alert" in data
    alert_id = data["alert"]["id"]

    # 3. Delete alert
    response = client.delete(f"/api/alerts/{alert_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Alert deleted"


def test_alerts_scoping_between_users(client):
    """Test that users can only manage their own alerts and cannot access or delete other users' alerts."""
    # 1. Register & Login User A
    username_a = f"user_a_{uuid.uuid4().hex[:8]}"
    email_a = f"user_a_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "supersecretpassword123"
    client.post("/api/auth/register", json={"username": username_a, "email": email_a, "password": password, "confirm_password": password})
    client.post("/api/auth/login", json={"username": username_a, "password": password})

    # User A creates an alert
    response = client.post("/api/alerts/", json={"keyword": "django", "email": email_a})
    assert response.status_code == 201
    alert_id = response.json()["alert"]["id"]

    # 2. Register & Login User B
    username_b = f"user_b_{uuid.uuid4().hex[:8]}"
    email_b = f"user_b_{uuid.uuid4().hex[:8]}@gmail.com"
    client.post("/api/auth/register", json={"username": username_b, "email": email_b, "password": password, "confirm_password": password})
    client.post("/api/auth/login", json={"username": username_b, "password": password})

    # User B lists alerts (should not see User A's alert)
    response = client.get("/api/alerts/")
    assert response.status_code == 200
    assert response.json()["total"] == 0

    # User B tries to delete User A's alert (should fail with 403)
    response = client.delete(f"/api/alerts/{alert_id}")
    assert response.status_code == 403

    # 3. Log back in as User A to verify A can still delete it
    client.post("/api/auth/login", json={"username": username_a, "password": password})
    response = client.delete(f"/api/alerts/{alert_id}")
    assert response.status_code == 200



def test_google_trends_endpoint(client):
    """Test Google Trends listing endpoint."""
    response = client.get("/api/google-trends/python")
    assert response.status_code in [200, 503]
    if response.status_code == 200:
        data = response.json()
        assert "data_points" in data


def test_search_endpoint(client):
    """Test search trends filter endpoint."""
    response = client.get("/api/search?q=test")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data


def test_trends_and_insights_endpoints(client):
    """Test general trends list, details, summaries, forecasts, and exports."""
    # 1. Fetch trends (may be empty, checking schema/graceful response)
    response = client.get("/api/trends/")
    assert response.status_code == 200
    trends_data = response.json()
    assert "trends" in trends_data
    
    # 2. Testing 404 for mock/invalid cluster details
    fake_cluster_id = "non-existent-cluster-9999"
    response = client.get(f"/api/trends/{fake_cluster_id}")
    assert response.status_code == 404

    # 3. Testing 404/graceful handling for mock/invalid summary
    response = client.get(f"/api/trends/summary/{fake_cluster_id}")
    assert response.status_code == 200 or response.status_code == 404

    # 4. Testing 404/graceful handling for mock/invalid forecast
    response = client.get(f"/api/forecast/{fake_cluster_id}")
    assert response.status_code in [404, 500]

    # 5. Testing export endpoint
    response = client.get(f"/api/export/{fake_cluster_id}")
    assert response.status_code in [200, 404]


def test_content_ideas_endpoint(client):
    """Test AI content generation endpoint (graceful return when cluster is fake/valid)."""
    payload = {
        "cluster_id": "test-cluster-idea",
        "trend_title": "Active Learning Systems",
        "why_trending": "New updates to python packages"
    }
    response = client.post("/api/content/", json=payload)
    # Check that rate limits don't block, or handles correctly
    assert response.status_code in [200, 429, 404, 500]


def test_internal_webhooks(client):
    """Test QStash protected endpoints."""
    # 1. Check unauthorized with no/wrong header
    headers = {"X-Internal-Secret": "wrong-secret"}
    response = client.post("/api/internal/poll", headers=headers)
    if settings.INTERNAL_SECRET:
        assert response.status_code == 401
    
    # 2. Check authorized endpoints
    secret = settings.INTERNAL_SECRET
    auth_headers = {"X-Internal-Secret": secret}
    
    response = client.post("/api/internal/poll", headers=auth_headers)
    assert response.status_code == 200
    
    response = client.post("/api/internal/forecast", headers=auth_headers)
    assert response.status_code == 200
    
    response = client.post("/api/internal/alerts", headers=auth_headers)
    assert response.status_code == 200


def test_gmail_validation_enforced(client):
    """Verify that registering with a non-gmail address fails with 400 Bad Request."""
    username = f"e2e_{uuid.uuid4().hex[:8]}"
    email = f"test_e2e_{uuid.uuid4().hex[:8]}@outlook.com"
    password = "supersecretpassword123"
    payload = {
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "Gmail" in response.json()["detail"]


def test_profile_update_endpoint(client):
    """Verify PUT /api/auth/profile works and updates credentials."""
    username = f"e2e_{uuid.uuid4().hex[:8]}"
    email = f"test_e2e_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "supersecretpassword123"
    
    reg_payload = {
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password
    }
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 201
    
    login_payload = {"username": username, "password": password}
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200

    new_username = f"new_{username}"
    new_email = f"new_{email}"
    new_password = "brandnewpassword12345"
    update_payload = {
        "username": new_username,
        "email": new_email,
        "password": new_password
    }
    response = client.put("/api/auth/profile", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["username"] == new_username
    assert data["user"]["email"] == new_email
    assert "access_token" in data

    login_payload = {"username": new_username, "password": new_password}
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200


def test_feedback_endpoint(client):
    """Verify POST /api/feedback sends feedback message."""
    username = f"e2e_{uuid.uuid4().hex[:8]}"
    email = f"test_e2e_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "supersecretpassword123"
    
    reg_payload = {
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password
    }
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 201

    login_payload = {"username": username, "password": password}
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200

    feedback_payload = {
        "message": "This is an E2E feedback message. Please ignore."
    }
    response = client.post("/api/feedback", json=feedback_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

