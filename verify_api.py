import requests
import json
import time

BASE_URL = "http://localhost:8080/api"

def verify_ride_history():
    print("--- Starting API Verification ---")
    
    # 1. Login
    login_data = {"usernameOrEmail": "admin", "password": "admin"}
    try:
        response = requests.post(f"{BASE_URL}/auth/sign-in", json=login_data)
        response.raise_for_status()
        token = response.json()["access_token"]
        print("1. Login successful.")
    except Exception as e:
        print(f"1. Login failed: {e}")
        return

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Get a shuttle ID
    try:
        response = requests.get(f"{BASE_URL}/shuttles/all?size=1", headers=headers)
        response.raise_for_status()
        shuttles = response.json()["content"]
        if not shuttles:
            print("2. No shuttles found to test with.")
            return
        shuttle_id = shuttles[0]["shuttleId"]
        print(f"2. Found shuttle ID: {shuttle_id}")
    except Exception as e:
        print(f"2. Failed to get shuttles: {e}")
        return

    # 3. Start Ride
    start_data = {"latitude": 14.5995, "longitude": 121.0437}
    try:
        response = requests.post(f"{BASE_URL}/shuttles/{shuttle_id}/start-ride", headers=headers, json=start_data)
        response.raise_for_status()
        print("3. Ride started successfully.")
    except Exception as e:
        print(f"3. Start ride failed: {e}")
        return

    # 4. End Ride
    end_data = {"latitude": 14.6000, "longitude": 121.0500}
    try:
        response = requests.post(f"{BASE_URL}/shuttles/{shuttle_id}/end-ride", headers=headers, json=end_data)
        if response.status_code != 200:
            print(f"4. End ride failed with status {response.status_code}: {response.text}")
            return
        print("4. Ride ended successfully and history saved.")
    except Exception as e:
        print(f"4. End ride failed: {e}")
        return

    # 5. Verify History
    try:
        response = requests.get(f"{BASE_URL}/shuttles/history", headers=headers)
        response.raise_for_status()
        history = response.json()
        print(f"5. Fetched {len(history)} history records.")
        
        # Check if our ride is there
        found = False
        for item in history:
            if item["shuttleId"] == shuttle_id:
                print(f"SUCCESS: Found ride history entry for shuttle {shuttle_id}!")
                print(f"Details: {json.dumps(item, indent=2)}")
                found = True
                break
        
        if not found:
            print(f"FAILURE: Ride history entry for shuttle {shuttle_id} not found in history log.")
    except Exception as e:
        print(f"5. Failed to fetch history: {e}")

if __name__ == "__main__":
    verify_ride_history()
