const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing team creation in syncTripToSupabase...');

// Find the team creation in syncTripToSupabase
const teamCreationPattern = /const teamName = \$\{profileData\.full_name \|\| user\.email\.split\('@'\)\[0\]\}'s Team';\s+const \{ data: teamData, error: teamError \} = await supabase\s+\.from\('teams'\)\s+\.insert\(\{\s+name: teamName,\s+subscription_tier: 'personal_free',\s+monthly_trip_limit: 30,\s+max_members: 1\s+\}\)\s+\.select\(\)\s+\.single\(\);/;

if (teamCreationPattern.test(code)) {
  console.log('✅ Found team creation in syncTripToSupabase');
  
  // Replace with version that uses a unique group_name
  const fixedPattern = `const teamName = \${profileData.full_name || user.email.split('@')[0]}'s Team';
        const uniqueId = Date.now().toString(36);
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            group_name: \`\${teamName.toLowerCase().replace(/\\s+/g, '-')}-\${uniqueId}\`,
            subscription_tier: 'personal_free',
            monthly_trip_limit: 30,
            max_members: 1
          })
          .select()
          .single();`;
  
  code = code.replace(teamCreationPattern, fixedPattern);
  console.log('✅ Added unique group_name to team creation');
} else {
  console.log('⚠️ Could not find team creation pattern');
}

fs.writeFileSync('App.js', code);
console.log('✅ syncTripToSupabase team creation fixed');
