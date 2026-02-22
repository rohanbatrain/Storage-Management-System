import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url="http://localhost:8000/api") as client:
        # Create Room 1
        resp = await client.post("/locations", json={"name": "Loc A", "kind": "room"})
        locA_id = resp.json()["id"]

        # Create Room 2
        resp2 = await client.post("/locations", json={"name": "Loc B", "kind": "room"})
        locB_id = resp2.json()["id"]

        # Create item in Loc A
        item_resp = await client.post("/items", json={"name": "Moving Item", "quantity": 1, "current_location_id": locA_id, "permanent_location_id": locA_id})
        item_id = item_resp.json()["id"]

        # Move item to Loc B
        move_resp = await client.post(f"/items/{item_id}/move", json={"to_location_id": locB_id, "notes": "test move"})
        print("Move resp:", move_resp.status_code, move_resp.text)

        # Delete Loc A
        del_resp = await client.delete(f"/locations/{locA_id}")
        if del_resp.status_code != 204:
            print("Failed to delete location A:", del_resp.text)
        else:
            print("Successfully deleted location A!")

        # Delete Loc B
        del_resp2 = await client.delete(f"/locations/{locB_id}")
        if del_resp2.status_code != 204:
            print("Failed to delete location B:", del_resp2.text)
        else:
            print("Successfully deleted location B!")

if __name__ == "__main__":
    asyncio.run(test())
