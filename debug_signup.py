import os
from dotenv import load_dotenv
import requests

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# The true cause of "Database error querying schema" on login is almost ALWAYS a bad Trigger or RLS on public.users 
# that Supabase Auth tries to write to or read from during sign_in.
# Let's query the PostgreSQL pg_trigger table via the REST API if exposed, or just check our own tables.

print("Checking if any triggers exist on auth.users or public tables...")
query = {
    "query": "SELECT event_object_schema, event_object_table, trigger_name, event_manipulation, action_statement FROM information_schema.triggers;"
}
# Since we can't run raw SQL easily via the standard REST API without a custom RPC function, 
# let's just inspect the `user_roles` table to see if RLS is enabled and blocking Auth.

try:
    # Check if we can read user_roles
    res = requests.get(f"{url}/rest/v1/user_roles?select=*", headers=headers)
    print(f"user_roles fetch: {res.status_code}")
except Exception as e:
     pass

# Actually, the most common issue is that the user's password crypt() in our seed script was wrong,
# OR the user was inserted without a proper 'aud' field = 'authenticated'.
print("Attempting to read the seeded user from auth API...")

# Let's just create a test user right now using the API instead of SQL to see if the API flow works natively!
auth_payload = {
    "email": "test_auth_check_vishaal@gmail.com",
    "password": "Password123!"
}
try:
    print("\nAttempting to SIGN UP a new user via API to see if the DB allows it...")
    response = requests.post(f"{url}/auth/v1/signup", headers=headers, json=auth_payload, timeout=10)
    print(f"Signup Status: {response.status_code}")
    print(f"Signup Response: {response.json()}")
except Exception as e:
    print(f"Failed to reach Auth API: {e}")
