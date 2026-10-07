/**
 * Creates (or promotes) an admin account.
 *
 * Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' ADMIN_NAME='Your Name' \
 *        node src/scripts/create-admin.js
 *
 * The credentials come from the environment on purpose: they are never written in the repository.
 * It uses the service role key from `.env.local`, so double-check which project that file points to.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME || 'Admin';

if (!url || !serviceKey) {
  console.error('Error: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}
if (!email || !password) {
  console.error('Error: set ADMIN_EMAIL and ADMIN_PASSWORD in the environment (they are not read from any file).');
  process.exit(1);
}

// The service role bypasses RLS
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdmin() {
  console.log(`Creating/updating admin: ${email}...`);

  // 1. Create the auth user (the profile row is created by the on_auth_user_created trigger)
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, rating: 3.5 },
  });

  let userId = userData?.user?.id;

  if (createError) {
    if (!createError.message.includes('already been registered')) {
      console.error(`Error creating auth user: ${createError.message}`);
      return;
    }
    // Already registered: find its id to promote it
    console.log('User already exists. Fetching its id to update the role...');
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users.find((u) => u.email === email);
    if (!existing) {
      console.error('Could not find the existing user.');
      return;
    }
    userId = existing.id;
  }

  console.log(`User id: ${userId}`);

  // 2. Promote the profile to admin
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin', full_name: fullName, rating: 3.5 })
    .eq('id', userId);

  if (profileError) {
    console.error(`Error updating the profile role: ${profileError.message}`);
  } else {
    console.log(`Done: ${fullName} is now an admin.`);
  }
}

createAdmin();
