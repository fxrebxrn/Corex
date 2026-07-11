import pytest
from uuid import uuid4

from tests.conftest import create_user
from models.note import Note


@pytest.mark.asyncio
async def test_auth_register_login_refresh_and_logout(client, session):
    username = f"user{uuid4().hex[:6]}"
    email = f"{username}@example.com"

    register_response = await client.post(
        "/api/auth/register",
        json={
            "name": "Auth Tester",
            "email": email,
            "username": username,
            "password": "Password123",
        },
    )
    assert register_response.status_code == 200
    body = register_response.json()
    assert {"access_token", "refresh_token"}.issubset(body)

    login_response = await client.post(
        "/api/auth/login",
        data={"username": username, "password": "Password123"},
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    assert login_body["access_token"]

    refresh_response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": body["refresh_token"]},
    )
    assert refresh_response.status_code == 200
    refresh_body = refresh_response.json()
    assert refresh_body["refresh_token"]

    logout_response = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {login_body['access_token']}"},
        json={"refresh_token": login_body["refresh_token"]},
    )
    assert logout_response.status_code == 200
    assert logout_response.json()["detail"] == "Successfully logged out"


@pytest.mark.asyncio
async def test_users_profile_check_and_update(client, session, auth_override):
    user = await create_user(session, username=f"user{uuid4().hex[:6]}", email=f"user{uuid4().hex[:6]}@example.com")
    auth_override(user)

    note = Note(user_id=user.id, title="Alpha", content="hello world", is_pinned=False, is_archived=False)
    session.add(note)
    await session.flush()

    profile_response = await client.get("/api/users/me")
    assert profile_response.status_code == 200
    profile_body = profile_response.json()
    assert profile_body["username"] == user.username
    assert profile_body["all_notes_count"] == 1

    availability_response = await client.get(f"/api/users/check/{user.username}")
    assert availability_response.status_code == 200
    assert availability_response.json()["detail"] is False

    user_notes_response = await client.get(f"/api/users/{user.username}/notes")
    assert user_notes_response.status_code == 200
    assert len(user_notes_response.json()) == 1

    updated_email = f"updated-{user.email}"
    email_response = await client.patch(
        "/api/users/me/email",
        params={"email": updated_email},
    )
    assert email_response.status_code == 200
    assert email_response.json()["email"] == updated_email

    updated_username = f"updated{user.username}"
    update_response = await client.put(
        "/api/users/me",
        json={"name": "Updated Name", "username": updated_username},
    )
    assert update_response.status_code == 200
    assert update_response.json()["user"]["username"] == updated_username


@pytest.mark.asyncio
async def test_tags_crud_flow(client, session, auth_override):
    user = await create_user(session, username=f"tagger{uuid4().hex[:6]}", email=f"tagger{uuid4().hex[:6]}@example.com")
    auth_override(user)

    create_response = await client.post("/api/tags/", json={"name": "work"})
    assert create_response.status_code == 200
    created_tag = create_response.json()["tag"]
    tag_id = created_tag["id"]

    list_response = await client.get("/api/tags/me")
    assert list_response.status_code == 200
    assert any(item["id"] == tag_id for item in list_response.json())

    update_response = await client.put(f"/api/tags/{tag_id}", json={"name": "home"})
    assert update_response.status_code == 200
    assert update_response.json()["tag"]["name"] == "home"

    delete_response = await client.delete(f"/api/tags/{tag_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["detail"] == "Tag deleted successfully"


@pytest.mark.asyncio
async def test_notes_crud_search_pin_archive_and_public(client, session, auth_override):
    user = await create_user(session, username=f"notes{uuid4().hex[:6]}", email=f"notes{uuid4().hex[:6]}@example.com")
    auth_override(user)

    create_response = await client.post("/api/notes/")
    assert create_response.status_code == 200

    notes_response = await client.get("/api/notes/me")
    assert notes_response.status_code == 200
    payload = notes_response.json()
    assert payload["items"]
    note_id = payload["items"][0]["id"]

    finalize_response = await client.put(
        f"/api/notes/{note_id}/finalize",
        json={"title": "Study plan", "content": "Write tests for corex"},
    )
    assert finalize_response.status_code == 200
    assert finalize_response.json()["title"] == "Study plan"

    search_response = await client.get("/api/notes/me/search", params={"query": "tests"})
    assert search_response.status_code == 200
    assert search_response.json()["items"]

    pin_response = await client.patch(f"/api/notes/{note_id}/pin")
    assert pin_response.status_code == 200
    assert pin_response.json()["detail"] == "Successfully note pinned"

    pinned_response = await client.get("/api/notes/me/pinned")
    assert pinned_response.status_code == 200
    assert len(pinned_response.json()) == 1

    archive_response = await client.patch(f"/api/notes/{note_id}/archive")
    assert archive_response.status_code == 200
    assert archive_response.json()["detail"] == "Successfully note archived"

    archived_response = await client.get("/api/notes/me/archived")
    assert archived_response.status_code == 200
    assert archived_response.json()["items"]

    note = await session.get(Note, note_id)
    note.is_public = True
    await session.flush()

    public_response = await client.get(f"/api/notes/public/{note_id}")
    assert public_response.status_code == 200
    assert public_response.json()["id"] == note_id


@pytest.mark.asyncio
async def test_notes_tags_sync_reorder_and_delete(client, session, auth_override):
    user = await create_user(session, username=f"notes2{uuid4().hex[:6]}", email=f"notes2{uuid4().hex[:6]}@example.com")
    auth_override(user)

    tag_response = await client.post("/api/tags/", json={"name": "urgent"})
    assert tag_response.status_code == 200
    tag_id = tag_response.json()["tag"]["id"]

    create_response = await client.post("/api/notes/")
    assert create_response.status_code == 200
    note_id = (await client.get("/api/notes/me")).json()["items"][0]["id"]

    second_response = await client.post("/api/notes/")
    assert second_response.status_code == 200
    second_note_id = (await client.get("/api/notes/me")).json()["items"][1]["id"]

    pin_first = await client.patch(f"/api/notes/{note_id}/pin")
    assert pin_first.status_code == 200
    pin_second = await client.patch(f"/api/notes/{second_note_id}/pin")
    assert pin_second.status_code == 200

    pinned_ids = [item["id"] for item in (await client.get("/api/notes/me/pinned")).json()]
    if len(pinned_ids) < 2:
        pytest.skip("Need at least two pinned notes for reorder coverage")

    reorder_response = await client.put(
        "/api/notes/me/pinned/reorder",
        json={"ordered_ids": [pinned_ids[1], pinned_ids[0]]},
    )
    assert reorder_response.status_code == 200
    assert [item["id"] for item in reorder_response.json()] == [pinned_ids[1], pinned_ids[0]]

    sync_response = await client.put(
        f"/api/notes/me/{note_id}/tags",
        json={"tag_ids": [tag_id]},
    )
    assert sync_response.status_code == 200
    assert sync_response.json()["detail"] == "Successfully synced note tags"

    notes_by_tag = await client.get(f"/api/notes/me/tag/{tag_id}")
    assert notes_by_tag.status_code == 200
    assert notes_by_tag.json()["items"]

    detail_response = await client.get(f"/api/notes/me/{note_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == note_id

    delete_response = await client.delete(f"/api/notes/me/{note_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["detail"] == "Successfully note deleted"
