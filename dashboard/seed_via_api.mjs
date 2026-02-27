import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let serviceRoleKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
});

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials in dashboard/.env');
    process.exit(1);
}

const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

const usersToSeed = [
    { email: 'superadmin.demo.ghl@gmail.com', role: 'platform_admin' },
    { email: 'agencyadmin.demo.ghl@gmail.com', role: 'agency_admin' },
    { email: 'subaccount.demo.ghl@gmail.com', role: 'sub_account_user' }
];

async function seed() {
    console.log("--- Seeding Users via Supabase Auth API ---");
    let userIds = {};

    for (const u of usersToSeed) {
        console.log(`\nSigning up ${u.email}...`);

        let res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ email: u.email, password: 'Password123!' })
        });

        if (res.status === 200) {
            const data = await res.json();
            userIds[u.email] = data.user?.id || data.id;
            console.log(`Success! User ID: ${userIds[u.email]}`);
        } else if (res.status === 400) {
            console.log(`User already registered. Getting ID via login...`);
            let resLogin = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ email: u.email, password: 'Password123!' })
            });
            if (resLogin.status === 200) {
                const data = await resLogin.json();
                userIds[u.email] = data.user.id;
                console.log(`Login successful! User ID: ${userIds[u.email]}`);
            } else {
                console.log(`Failed to login: ${await resLogin.text()}`);
            }
        } else {
            console.log(`Failed to sign up: ${await res.text()}`);
        }
    }

    if (Object.keys(userIds).length !== 3) {
        console.log("\nCould not get all 3 User IDs. Please delete them from Supabase manually.");
        process.exit(1);
    }

    console.log("\n--- Seeding Public Tables via Supabase Data API ---");

    // Clear old data
    await fetch(`${supabaseUrl}/rest/v1/sub_account_settings?sub_account_id=not.eq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers });
    await fetch(`${supabaseUrl}/rest/v1/user_roles?user_id=not.eq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers });
    await fetch(`${supabaseUrl}/rest/v1/sub_accounts?name=eq.Demo Roofing Sub-Account`, { method: 'DELETE', headers });
    await fetch(`${supabaseUrl}/rest/v1/agencies?name=eq.Demo Agency LLC`, { method: 'DELETE', headers });

    // 1. Insert Agency
    let agencyRes = await fetch(`${supabaseUrl}/rest/v1/agencies`, {
        method: 'POST', headers, body: JSON.stringify({ name: 'Demo Agency LLC', is_active: true })
    });
    let agencyData = await agencyRes.json();
    if (!agencyRes.ok) {
        console.error("Failed to insert agency:", agencyData);
        process.exit(1);
    }
    let agencyId = agencyData[0].id;
    console.log(`Created Agency: ${agencyId}`);

    // 2. Insert Sub Account
    let subAccRes = await fetch(`${supabaseUrl}/rest/v1/sub_accounts`, {
        method: 'POST', headers, body: JSON.stringify({ agency_id: agencyId, name: 'Demo Roofing Sub-Account', is_active: true })
    });
    let subAccData = await subAccRes.json();
    let subAccId = subAccData[0].id;
    console.log(`Created Sub-Account: ${subAccId}`);

    // 3. Settings
    let randPhone = "+1" + Math.floor(Math.random() * 9000000000 + 1000000000);
    await fetch(`${supabaseUrl}/rest/v1/sub_account_settings`, {
        method: 'POST', headers, body: JSON.stringify({
            sub_account_id: subAccId,
            assigned_number: randPhone,
            first_line: "Hello! I am your AI assistant.",
            agent_instructions: "You are a helpful roofer assistant."
        })
    });
    console.log(`Created Settings for phone ${randPhone}`);

    // 4. Map Roles
    await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
        method: 'POST', headers, body: JSON.stringify({
            user_id: userIds['superadmin.demo.ghl@gmail.com'], role: 'platform_admin'
        })
    });
    await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
        method: 'POST', headers, body: JSON.stringify({
            user_id: userIds['agencyadmin.demo.ghl@gmail.com'], agency_id: agencyId, role: 'agency_admin'
        })
    });
    await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
        method: 'POST', headers, body: JSON.stringify({
            user_id: userIds['subaccount.demo.ghl@gmail.com'], sub_account_id: subAccId, role: 'sub_account_user'
        })
    });

    console.log("\n✅ Successfully seeded all users API! You can now log in.");
}

seed();
