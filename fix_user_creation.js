const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing new user registration - removing automatic team creation...');

// Find the section where team is created for new users
// Look for: "No profile found, creating one..."
const profileCreation = code.match(/if \(!currentProfile\) \{[\s\S]*?\/\/ Create the team[\s\S]*?const { data: teamData, error: teamError } = await supabase[\s\S]*?\.from\('teams'\)[\s\S]*?\.insert\(\{[\s\S]*?name: teamName,[\s\S]*?subscription_tier: 'personal_free',[\s\S]*?monthly_trip_limit: 30,[\s\S]*?max_members: 1[\s\S]*?\}\)[\s\S]*?\.select\(\)[\s\S]*?\.single\(\);/);

if (profileCreation) {
  console.log('✅ Found team creation in new user flow');
  
  // Replace with version that doesn't create a team
  const fixedCreation = code.replace(
    /\/\/ Create the team\s+const teamName = \${user\.email\.split\('@'\)\[0\]}'s Team';\s+const { data: teamData, error: teamError } = await supabase\s+\.from\('teams'\)\s+\.insert\(\{\s+name: teamName,\s+subscription_tier: 'personal_free',\s+monthly_trip_limit: 30,\s+max_members: 1\s+\}\)\s+\.select\(\)\s+\.single\(\);\s+if \(teamError\) \{\s+console\.error\('Team creation error:', teamError\);\s+\} else \{\s+currentTeamId = teamData\.id;\s+console\.log\('Team created:', currentTeamId\);\s+\}/,
    `// Don't create a team for new users - they can create or join one later
      console.log('ℹ️ New user - no team created');`
  );
  code = fixedCreation;
  console.log('✅ Removed automatic team creation');
}

// Also update the profile creation to set team_id as null
code = code.replace(
  /team_id: currentTeamId/,
  "team_id: null"
);

fs.writeFileSync('App.js', code);
console.log('✅ New user registration fixed - users will no longer get automatic teams');
console.log('');
console.log('📝 Changes:');
console.log('1. Removed automatic team creation for new users');
console.log('2. New users now have team_id = null');
console.log('3. Users can create or join groups later');
