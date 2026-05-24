import pytest
import os
import uuid
from fastapi.testclient import TestClient
from app.config import settings
from app.database import init_db

@pytest.fixture(scope="module")
def client():
    # Force testing mode during tests
    settings.ENVIRONMENT = "testing"
    from main import app
    with TestClient(app) as test_client:
        yield test_client


def test_unauthenticated_access_denied(client):
    """Verify that unauthenticated requests to admin routes fail with 401."""
    # Logout first to ensure no cookies persist
    client.post("/api/auth/logout")

    response = client.get("/api/admin/users")
    assert response.status_code == 401

    response = client.put("/api/admin/users/1", json={"role": "admin"})
    assert response.status_code == 401

    response = client.delete("/api/admin/users/1")
    assert response.status_code == 401


def test_non_admin_access_forbidden(client):
    """Verify that regular (non-admin) users cannot access admin endpoints."""
    # 1. Register and login a normal user
    username = f"user_{uuid.uuid4().hex[:8]}"
    email = f"user_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "regularpassword123"

    reg_payload = {
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password
    }
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 201

    # Login
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["user"]["role"] == "user"

    # 2. Access admin routes (should get 403)
    response = client.get("/api/admin/users")
    assert response.status_code == 403
    assert "Admin privileges required" in response.json()["detail"]

    response = client.put(f"/api/admin/users/{user_data['user']['id']}", json={"role": "admin"})
    assert response.status_code == 403

    response = client.delete(f"/api/admin/users/{user_data['user']['id']}")
    assert response.status_code == 403


def test_admin_access_and_management(client):
    """Verify that the seeded admin user can log in and perform user CRUD operations."""
    # 1. Log in as the seeded admin
    admin_payload = {
        "username": "firstImmortal",
        "password": "24180416"
    }
    response = client.post("/api/auth/login", json=admin_payload)
    assert response.status_code == 200
    admin_data = response.json()
    assert admin_data["user"]["username"] == "firstimmortal"
    assert admin_data["user"]["email"] == "durgaharshithpigili@gmail.com"
    assert admin_data["user"]["role"] == "admin"

    # 2. Create a normal user to modify/delete
    test_user_name = f"mod_{uuid.uuid4().hex[:8]}"
    test_email = f"mod_{uuid.uuid4().hex[:8]}@gmail.com"
    reg_payload = {
        "username": test_user_name,
        "email": test_email,
        "password": "testpassword123",
        "confirm_password": "testpassword123"
    }
    
    # We register via the public auth endpoint, but we must logout first
    client.post("/api/auth/logout")
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 201
    created_id = response.json()["user"]["id"]

    # Log back in as admin
    response = client.post("/api/auth/login", json=admin_payload)
    assert response.status_code == 200

    # 3. Admin: GET all users
    response = client.get("/api/admin/users")
    assert response.status_code == 200
    users_list = response.json()
    assert len(users_list) >= 2
    user_ids = [u["id"] for u in users_list]
    assert created_id in user_ids

    # 4. Admin: Update user's role and status
    update_payload = {
        "username": f"updated_{test_user_name}",
        "email": f"updated_{test_email}",
        "role": "admin",
        "is_active": True,
        "active_sources": ["github", "newsapi"]
    }
    response = client.put(f"/api/admin/users/{created_id}", json=update_payload)
    assert response.status_code == 200
    updated_data = response.json()
    assert updated_data["username"] == f"updated_{test_user_name}"
    assert updated_data["email"] == f"updated_{test_email}"
    assert updated_data["role"] == "admin"
    assert updated_data["active_sources"] == "github,newsapi"

    # 5. Admin: Cannot delete own account
    admin_id = admin_data["user"]["id"]
    response = client.delete(f"/api/admin/users/{admin_id}")
    assert response.status_code == 400
    assert "Cannot delete your own admin account" in response.json()["detail"]

    # 6. Admin: Cannot demote or deactivate own account
    response = client.put(f"/api/admin/users/{admin_id}", json={"role": "user"})
    assert response.status_code == 400
    assert "Cannot demote yourself from admin" in response.json()["detail"]

    response = client.put(f"/api/admin/users/{admin_id}", json={"is_active": False})
    assert response.status_code == 400
    assert "Cannot deactivate yourself" in response.json()["detail"]

    # 7. Admin: Delete user
    response = client.delete(f"/api/admin/users/{created_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "User deleted successfully"

    # Verify user is gone
    response = client.get("/api/admin/users")
    users_list = response.json()
    user_ids = [u["id"] for u in users_list]
    assert created_id not in user_ids
