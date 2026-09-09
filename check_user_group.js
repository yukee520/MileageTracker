const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dkpjicqepexhgbrzzreo.supabase.co',
  'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx'
);

async function checkUser() {
  // Get the current user from AsyncStorage or prompt
  console.log('🔍 Checking user status in database...');
  console.log('');
  console.log('Please run this SQL in Supabase SQL Editor:');
  console.log('');
  console.log('-- Check your user status');
  console.log("SELECT id, email, team_id, role FROM profiles WHERE email = 'YOUR_EMAIL_HERE';");
  console.log('');
  console.log('-- If you want to leave the group and see Create Group button:');
  console.log("UPDATE profiles SET team_id = null, role = 'member' WHERE email = 'YOUR_EMAIL_HERE';");
  console.log('');
}

checkUser();
