import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(url, key)

try:
    response = supabase.auth.sign_in_with_password({
        "email": "superadmin.demo.ghl@gmail.com",
        "password": "Password123!"
    })
    print("Login successful!")
    print(response.user.id)
except Exception as e:
    print("Login failed:", e)

# Check if user exists in auth.users (Requires service_role key, but since we have SUPABASE_KEY it might be the anon key or service role key)
# The .env says SUPABASE_KEY which is usually the anon key.
