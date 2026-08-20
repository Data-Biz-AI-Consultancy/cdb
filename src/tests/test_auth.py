import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register a new user
    register_payload = {
        "email": "alice@example.com",
        "password": "strongpassword123",
        "full_name": "Alice Smith",
        "role": "admin",
    }
    response = await client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201
    user_data = response.json()
    assert user_data["email"] == "alice@example.com"
    assert user_data["full_name"] == "Alice Smith"
    assert user_data["role"] == "admin"
    assert "id" in user_data

    # 2. Duplicate registration fails with 409 CONFLICT
    response = await client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 409
    error_data = response.json()
    assert error_data["error"]["code"] == "CONFLICT"

    # 3. Login with correct credentials
    login_payload = {
        "email": "alice@example.com",
        "password": "strongpassword123",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "Bearer"
    assert token_data["user"]["email"] == "alice@example.com"
    assert "refresh_token" in response.cookies

    # 4. Login with invalid password fails with 401 UNAUTHORIZED
    bad_login = {
        "email": "alice@example.com",
        "password": "wrongpassword",
    }
    response = await client.post("/api/v1/auth/login", json=bad_login)
    assert response.status_code == 401
    error_data = response.json()
    assert error_data["error"]["code"] == "UNAUTHORIZED"

    # 5. Access protected /me endpoint with Bearer token
    access_token = token_data["access_token"]
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    me_data = response.json()
    assert me_data["email"] == "alice@example.com"

    # 6. Access /me without token fails
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    error_data = response.json()
    assert error_data["error"]["code"] == "UNAUTHORIZED"

    # 7. Refresh token flow
    refresh_token = response.cookies.get("refresh_token") or token_data.get("refresh_token")
    # Using the cookie from previous login
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    new_token_data = response.json()
    assert "access_token" in new_token_data

    # 8. Logout
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
