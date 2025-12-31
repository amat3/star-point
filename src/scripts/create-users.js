const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment.");
  process.exit(1);
}

const supabase = createClient(url, key);

const user = { email: 'tinkerbell@tinkerbell.com', password: 'aaa111!', full_name: 'Tinker Bell' };

async function seed() {
  console.log(`Starting user creation for ${user.full_name}...`);
  
  const { data, error } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
    options: {
      data: {
        full_name: user.full_name,
      },
    },
  });

  if (error) {
    console.error(`Failed to create ${user.email}: ${error.message}`);
  } else {
    console.log(`Successfully requested creation for ${user.email}. ID: ${data.user?.id}`);
  }
}

seed();
