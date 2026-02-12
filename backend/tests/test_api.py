
def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_create_location(client):
    response = client.post(
        "/api/locations/",
        json={"name": "Test Location", "description": "A test location", "kind": "room"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Location"
    assert "id" in data
    
    # Clean up (usually handled by rollback fixture but good to check delete too)
    loc_id = data["id"]
    response = client.delete(f"/api/locations/{loc_id}")
    assert response.status_code == 204

def test_create_item(client):
    # First create a location
    loc_resp = client.post(
        "/api/locations/",
        json={"name": "Item Location", "kind": "room"}
    )
    assert loc_resp.status_code == 201
    loc_id = loc_resp.json()["id"]

    # Create item
    response = client.post(
        "/api/items/",
        json={
            "name": "Test Item",
            "description": "A test item",
            "quantity": 1,
            "current_location_id": loc_id,
            "permanent_location_id": loc_id
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Item"
    assert data["permanent_location_id"] == loc_id
    
    # Check if item is in location
    loc_detail = client.get(f"/api/locations/{loc_id}")
    assert loc_detail.status_code == 200
    # Note: Structure depends on response model, assuming items list or count
    # But let's check item directly first
