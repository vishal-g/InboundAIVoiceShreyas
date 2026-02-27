import os
import requests
from dotenv import load_dotenv
from supabase import create_client, Client
import random

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(url, key)

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

users_to_seed = [
    {"email": "superadmin.demo.ghl@gmail.com", "role": "platform_admin"},
    {"email": "agencyadmin.demo.ghl@gmail.com", "role": "agency_admin"},
    {"email": "subaccount.demo.ghl@gmail.com", "role": "sub_account_user"}
]

print("--- Seeding Users via Supabase Auth API ---")

user_ids = {}

for u in users_to_seed:
    email = u["email"]
    # 1. Sign up the user officially through the Auth API to ensure identities are created
    auth_payload = {
        "email": email,
        "password": "Password123!"
    }
    print(f"\nSigning up {email}...")
    res = requests.post(f"{url}/auth/v1/signup", headers=headers, json=auth_payload)
    
    if res.status_code == 200:
        data = res.json()
        user_id = data.get("id") or (data.get("user", {}).get("id"))
        user_ids[email] = user_id
        print(f"Success! User ID: {user_id}")
    elif res.status_code == 400 and "already registered" in res.text.lower():
        print(f"User already officially registered. Attempting to log in to get ID...")
        res_login = requests.post(f"{url}/auth/v1/token?grant_type=password", headers=headers, json=auth_payload)
        if res_login.status_code == 200:
            user_ids[email] = res_login.json()["user"]["id"]
            print(f"Login successful! User ID: {user_ids[email]}")
        else:
             print(f"Failed to login to existing user. You may need to delete them from auth.users manually. {res_login.text}")
    else:
        print(f"Failed to sign up: {res.text}")

# If we didn't get all 3 IDs, we can't safely proceed
if len(user_ids) != 3:
    print("\nCould not get all 3 User IDs. Please delete them from Supabase auth.users and try again.")
    print("SQL: DELETE FROM auth.users WHERE email LIKE '%@gmail.com';")
    exit(1)

print("\n--- Seeding Public Tables via Supabase Data API ---")

# Clear the old broken data first
supabase.table("sub_account_settings").delete().neq("sub_account_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("user_roles").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("sub_accounts").delete().eq("name", "Demo Roofing Sub-Account").execute()
supabase.table("agencies").delete().eq("name", "Demo Agency LLC").execute()

print("Cleared existing test public data.")

# 1. Insert Agency
agency_res = supabase.table("agencies").insert({"name": "Demo Agency LLC", "is_active": True}).execute()
agency_id = agency_res.data[0]["id"]
print(f"Created Agency: {agency_id}")

# 2. Insert Sub Account
sub_acc_res = supabase.table("sub_accounts").insert({"agency_id": agency_id, "name": "Demo Roofing Sub-Account", "is_active": True}).execute()
sub_account_id = sub_acc_res.data[0]["id"]
print(f"Created Sub-Account: {sub_account_id}")

# 3. Create Settings
rand_phone = "+1" + str(random.randint(2000000000, 9999999999))
supabase.table("sub_account_settings").insert({
    "sub_account_id": sub_account_id,
    "assigned_number": rand_phone,
    "first_line": "Hello! I am your AI assistant.",
    "agent_instructions": "You are a helpful roofer assistant."
}).execute()
print(f"Created Settings for phone {rand_phone}")

# 4. Map Roles
supabase.table("user_roles").insert({
    "user_id": user_ids["superadmin.demo.ghl@gmail.com"],
    "agency_id": None,
    "sub_account_id": None,
    "role": "platform_admin"
}).execute()

supabase.table("user_roles").insert({
    "user_id": user_ids["agencyadmin.demo.ghl@gmail.com"],
    "agency_id": agency_id,
    "sub_account_id": None,
    "role": "agency_admin"
}).execute()

supabase.table("user_roles").insert({
    "user_id": user_ids["subaccount.demo.ghl@gmail.com"],
    "agency_id": None,
    "sub_account_id": sub_account_id,
    "role": "sub_account_user"
}).execute()

print("\n✅ Successfully seeded all users and mapped their roles! You can now log in.")
