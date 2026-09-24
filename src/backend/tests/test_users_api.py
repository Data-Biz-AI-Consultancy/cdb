import pytest
from httpx import AsyncClient

from cdb.core.security import create_access_token
from cdb.models.user import User


@pytest.fixture
async def auth_headers(db_session) -> dict[str, str]:
    user = User(
        email="admin@example.com",
        hashed_pw="hashed",
        full_name="Admin User",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_users_crud_flow(client: AsyncClient, auth_headers: dict[str, str]):
    # 1. Create a few users
    user_1_payload = {
        "email": "sarah.connor@acme.com",
        "password": "securepassword123",
        "full_name": "Sarah Connor",
        "role": "manager",
        "is_active": True,
    }
    res1 = await client.post("/api/v1/users", json=user_1_payload, headers=auth_headers)
    assert res1.status_code == 201
    u1 = res1.json()
    assert u1["email"] == "sarah.connor@acme.com"
    assert u1["full_name"] == "Sarah Connor"
    assert u1["role"] == "manager"
    assert u1["is_active"] is True
    u1_id = u1["id"]

    user_2_payload = {
        "email": "john.reese@acme.com",
        "password": "securepassword123",
        "full_name": "John Reese",
        "role": "sdr",
        "is_active": True,
    }
    res2 = await client.post("/api/v1/users", json=user_2_payload, headers=auth_headers)
    assert res2.status_code == 201
    u2 = res2.json()
    u2_id = u2["id"]

    # 2. Duplicate creation fails with 409
    res_dup = await client.post("/api/v1/users", json=user_1_payload, headers=auth_headers)
    assert res_dup.status_code == 409

    # 3. List users
    res_list = await client.get("/api/v1/users", headers=auth_headers)
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["total"] >= 2
    items = list_data["items"]
    emails = [item["email"] for item in items]
    assert "sarah.connor@acme.com" in emails
    assert "john.reese@acme.com" in emails

    # 4. Search users by query
    res_search = await client.get("/api/v1/users?q=Reese", headers=auth_headers)
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert any(u["id"] == u2_id for u in search_data["items"])
    assert not any(u["id"] == u1_id for u in search_data["items"])

    # 5. Filter users by role
    res_role = await client.get("/api/v1/users?role=manager", headers=auth_headers)
    assert res_role.status_code == 200
    role_data = res_role.json()
    assert any(u["id"] == u1_id for u in role_data["items"])
    assert not any(u["id"] == u2_id for u in role_data["items"])

    # 6. Get user by ID
    res_get = await client.get(f"/api/v1/users/{u1_id}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["full_name"] == "Sarah Connor"

    # 7. Update user
    update_payload = {
        "full_name": "Sarah J. Connor",
        "role": "admin",
    }
    res_update = await client.patch(
        f"/api/v1/users/{u1_id}", json=update_payload, headers=auth_headers
    )
    assert res_update.status_code == 200
    assert res_update.json()["full_name"] == "Sarah J. Connor"
    assert res_update.json()["role"] == "admin"

    # 8. Deactivate user
    res_del = await client.delete(f"/api/v1/users/{u2_id}", headers=auth_headers)
    assert res_del.status_code == 200

    # Verify u2 is inactive
    res_get_u2 = await client.get(f"/api/v1/users/{u2_id}", headers=auth_headers)
    assert res_get_u2.status_code == 200
    assert res_get_u2.json()["is_active"] is False

    # 9. Filter active only
    res_active = await client.get("/api/v1/users?is_active=true", headers=auth_headers)
    assert res_active.status_code == 200
    active_ids = [u["id"] for u in res_active.json()["items"]]
    assert u1_id in active_ids
    assert u2_id not in active_ids
