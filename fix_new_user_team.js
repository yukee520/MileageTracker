const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Fixing new user registration - removing automatic team creation...');

// Find the section where team is created for new users
// Look for the pattern: "No profile found, creating one..."
const teamCreationRegex = /console\.log\('No profile found, creating one\.\.\.'\);\s+const teamName = \$\{user\.email\.split\('@'\)\[0\]\}'s Team';\s+const \{ data: teamData, error: teamError \} = await supabase\s+\.from\('teams'\)\s+\.insert\(\{\s+name: teamName,\s+subscription_tier: 'personal_free',\s+monthly_trip_limit: 30,\s+max_members: 1\s+\}\)\s+\.select\(\)\s+\.single\(\);\s+if \(teamError\) \{\s+console\.error\('Team creation error:', teamError\);\s+\} else \{\s+currentTeamId = teamData\.id;\s+console\.log\('Team created:', currentTeamId\);\s+\}/;

if (teamCreationRegex.test(code)) {
  console.log('✅ Found team creation in new user flow - removing it');
  
  // Replace the team creation with a simple comment
  code = code.replace(
    teamCreationRegex,
    `console.log('No profile found, creating one...');
      // No team created - user can create or join one later`
  );
  console.log('✅ Removed automatic team creation');
} else {
  console.log('⚠️ Could not find team creation pattern, checking alternative...');
  
  // Alternative approach: look for the team insertion pattern
  const altRegex = /const teamName = \$\{user\.email\.split\('@'\)\[0\]\}'s Team';\s+const \{ data: teamData, error: teamError \} = await supabase\s+\.from\('teams'\)\s+\.insert\(\{/;
  
  if (altRegex.test(code)) {
    console.log('✅ Found team creation via alternative pattern');
    
    // Find the entire team creation block and remove it
    const startMatch = code.match(/const teamName = \$\{user\.email\.split\('@'\)\[0\]\}'s Team';/);
    if (startMatch) {
      const startIndex = code.indexOf(startMatch[0]);
      // Find the end of the team creation block (after the team creation and before profile insert)
      const afterTeam = code.substring(startIndex);
      const endMatch = afterTeam.match(/const \{ data: newProfile, error: createError \} = await supabase/);
      if (endMatch) {
        const endIndex = startIndex + afterTeam.indexOf(endMatch[0]);
        // Remove everything between start and end
        const before = code.substring(0, startIndex);
        const after = code.substring(endIndex);
        code = before + after;
        console.log('✅ Removed team creation block');
      }
    }
  } else {
    console.log('⚠️ No team creation found - may already be fixed');
  }
}

// Also make sure the profile creation sets team_id to null
code = code.replace(
  /team_id: currentTeamId/g,
  "team_id: null"
);

// Make sure the profile creation doesn't rely on currentTeamId for team_id
code = code.replace(
  /team_id: currentTeamId,/g,
  "team_id: null,"
);

// Ensure the comment about no team is clear
code = code.replace(
  /console\.log\('No profile found, creating one\.\.\.'\);/,
  `console.log('No profile found, creating one...');
      console.log('ℹ️ New user - no team created');`
);

fs.writeFileSync('App.js', code);
console.log('✅ New user registration fixed - users will no longer get automatic teams');
console.log('');
console.log('📝 Changes:');
console.log('1. Removed automatic team creation for new users');
console.log('2. New users now have team_id = null');
console.log('3. Users can create or join groups later');
console.log('');
console.log('🚀 Push to GitHub:');
console.log('git add App.js');
console.log('git commit -m "Fix: New users no longer get automatic teams"');
console.log('git push origin main');
