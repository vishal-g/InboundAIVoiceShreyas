import os
from dotenv import load_dotenv
import requests

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env")
    exit(1)

# Let's try to query the public.user_roles table directly as the anon user to see if RLS or permissions are completely broken
print(f"--- Testing connection to {url} ---")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# 1. Test basic REST API connectivity (Should return 200 OK even if empty due to RLS)
print("\n1. Querying public.user_roles...")
try:
    response = requests.get(f"{url}/rest/v1/user_roles?select=*", headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Failed to reach REST API: {e}")

# 2. Test Auth API connectivity (Try to trigger a fake login to get the exact JSON error)
print("\n2. Querying Auth API (Simulated Login)...")
auth_payload = {
    "email": "superadmin.demo.ghl@gmail.com",
    "password": "Password123!"
}
try:
    response = requests.post(f"{url}/auth/v1/token?grant_type=password", headers=headers, json=auth_payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Failed to reach Auth API: {e}")

