require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Error: Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Use Service Role to bypass RLS
const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const adminUser = {
  email: 'juanantamate@gmail.com',
  password: 'aaa111!',
  full_name: 'Juanan',
  role: 'admin'
};

async function createAdmin() {
  console.log(`Creating/Updating Admin: ${adminUser.email}...`);

  // 1. Create User (or get existing)
  // admin.createUser allows creating with specific attributes and auto-confirm
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: adminUser.email,
    password: adminUser.password,
    email_confirm: true,
    user_metadata: {
      full_name: adminUser.full_name,
      rating: 3.5 // Default rating
    }
  });

  let userId = userData?.user?.id;

  if (createError) {
    if (createError.message.includes('already been registered')) {
        console.log("User already exists. Fetching ID to update role...");
        // Fetch user ID by email not directly possible via admin.createUser error, 
        // but we can list users or try signIn (but we are admin).
        // Best way: listUsers with filter.
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData.users.find(u => u.email === adminUser.email);
        if (existing) {
            userId = existing.id;
        } else {
             console.error("Could not find existing user ID.");
             return;
        }
    } else {
        console.error(`Error creating auth user: ${createError.message}`);
        return;
    }
  }

  console.log(`User ID: ${userId}`);

  // 2. Update Profile Role
  // Since we are using service role key, we can update any profile.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
        role: 'admin',
        full_name: adminUser.full_name,
        rating: 3.5 // Ensure rating is set
    })
    .eq('id', userId);

  if (profileError) {
    console.error(`Error updating profile role: ${profileError.message}`);
    // If profile doesn't exist yet (race condition with trigger), we might need to insert?
    // Usually triggers handle creation. Let's try upsert if update failed? 
    // Actually, trigger usually creates profile on auth.users insert.
    // If the user already existed, profile should exist.
  } else {
    console.log(`✅ Successfully set role 'admin' for ${adminUser.full_name}`);
  }
}

createAdmin();
