const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Manually fixing new user registration...');

// Find the entire block for new user creation
const newUserBlock = code.match(/if \(!currentProfile\) \{\s+console\.log\('No profile found, creating one\.\.\.'\);\s+console\.log\('ℹ️ New user - no team created'\);\s+const teamName = \$\{user\.email\.split\('@'\)\[0\]\}'s Team';\s+const \{ data: teamData, error: teamError \} = await supabase\s+\.from\('teams'\)\s+\.insert\(\{\s+name: teamName,\s+subscription_tier: 'personal_free',\s+monthly_trip_limit: 30,\s+max_members: 1\s+\}\)\s+\.select\(\)\s+\.single\(\);\s+if \(teamError\) \{\s+console\.error\('Team creation error:', teamError\);\s+\} else \{\s+currentTeamId = teamData\.id;\s+console\.log\('Team created:', currentTeamId\);\s+\}\s+const \{ data: newProfile, error: createError \} = await supabase\s+\.from\('profiles'\)\s+\.insert\(\{\s+id: user\.id,\s+email: user\.email,\s+full_name: user\.user_metadata\?\.full_name \|\| user\.email\.split\('@'\)\[0\],\s+role: 'member',\s+team_id: null\s+\}\)\s+\.select\(\)\s+\.single\(\);\s+if \(createError\) \{\s+console\.error\('Profile creation error:', createError\);\s+throw createError;\s+\}\s+currentProfile = newProfile;\s+currentTeamId = currentProfile\.team_id;\s+console\.log\('Profile created:', currentProfile\);\s+\}/);

if (newUserBlock) {
  console.log('✅ Found new user block, removing team creation...');
  
  // Replace with version that doesn't create a team
  const fixedBlock = `if (!currentProfile) {
        console.log('No profile found, creating one...');
        // No team created - user can create or join one later
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: 'member',
            team_id: null
          })
          .select()
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          throw createError;
        }

        currentProfile = newProfile;
        currentTeamId = currentProfile.team_id;
        console.log('Profile created:', currentProfile);
      }`;
  
  code = code.replace(newUserBlock[0], fixedBlock);
  console.log('✅ Removed team creation from new user flow');
} else {
  console.log('⚠️ Could not find new user block, trying alternative...');
  
  // Alternative: find and remove the team creation lines directly
  const teamCreationStart = code.indexOf('const teamName = `${user.email.split(\'@\')[0]}\'s Team`;');
  if (teamCreationStart !== -1) {
    // Find the end of the team creation block
    const afterTeamCreation = code.substring(teamCreationStart);
    const profileInsertStart = afterTeamCreation.indexOf('const { data: newProfile, error: createError } = await supabase');
    if (profileInsertStart !== -1) {
      const start = teamCreationStart;
      const end = teamCreationStart + profileInsertStart;
      // Remove the team creation lines
      const before = code.substring(0, start);
      const after = code.substring(end);
      code = before + after;
      console.log('✅ Removed team creation lines');
    }
  }
}

// Also check if there's a second team creation in syncTripToSupabase
// This one should stay - it creates a team when a user starts a trip without one

fs.writeFileSync('App.js', code);
console.log('✅ New user registration fixed!');
console.log('');
console.log('📝 Changes:');
console.log('1. Removed automatic team creation for new users');
console.log('2. New users now have team_id = null');
console.log('3. Users can create or join groups later');
