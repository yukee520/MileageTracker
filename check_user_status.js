const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dkpjicqepexhgbrzzreo.supabase.co',
  'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx'
);

async function checkUser() {
  // Get the current user from localStorage or prompt
  console.log('🔍 Checking user status...');
  
  // This will check if you're in a group
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, team_id, role')
    .eq('email', 'YOUR_EMAIL_HERE') // Replace with your email
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  console.log('📊 User status:');
  console.log(`  Email: ${profile.email}`);
  console.log(`  Team ID: ${profile.team_id || 'No group'}`);
  console.log(`  Role: ${profile.role || 'member'}`);
  
  if (profile.team_id) {
    console.log('\n⚠️ You are currently in a group (team_id exists)');
    console.log('To see the "Create Group" button, you need to leave the group.');
    console.log('\nRun this SQL to leave the group:');
    console.log(`UPDATE profiles SET team_id = null, role = 'member' WHERE id = '${profile.id}';`);
  } else {
    console.log('\n✅ You are not in a group. The "Create Group" button should show.');
  }
}

checkUser();
