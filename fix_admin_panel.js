const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.js', 'utf8');

console.log('🔧 Fixing AdminPanel.js...');

// Find the loadData function and add null checks
code = code.replace(
  /const loadData = async \(\) => \{/,
  `const loadData = async () => {
    try {
      console.log('📊 AdminPanel: Loading data...');
      // Check if user has a team
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log('❌ AdminPanel: Profile error:', profileError);
        setLoading(false);
        return;
      }
      
      console.log('📊 AdminPanel: Profile:', profile);
      
      // If no team, show empty state
      if (!profile.team_id) {
        console.log('ℹ️ AdminPanel: User is not in a group');
        setTeamMembers([]);
        setLoading(false);
        return;
      }`
);

// Add error handling for when there's no team
code = code.replace(
  /setLoading\(false\);/g,
  `setLoading(false);
      console.log('✅ AdminPanel: Load complete');`
);

fs.writeFileSync('components/AdminPanel.js', code);
console.log('✅ AdminPanel.js fixed with null checks');
