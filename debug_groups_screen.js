const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

// Add debug logs to track what's happening
console.log('🔧 Adding debug logs to GroupsScreen...');

// 1. Add debug at the start of loadGroupData
code = code.replace(
  /const loadGroupData = async \(\) => \{/,
  `const loadGroupData = async () => {
    console.log('🔍 loadGroupData called');
    console.log('👤 User ID:', user?.id);
    console.log('👤 User email:', user?.email);`
);

// 2. Add debug after profile fetch
code = code.replace(
  /const { data: profile, error: profileError } = await supabase/,
  `console.log('📡 Fetching profile from Supabase...');
    const { data: profile, error: profileError } = await supabase`
);

code = code.replace(
  /if \(profileError\) throw profileError;/,
  `if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      throw profileError;
    }
    console.log('✅ Profile fetched:', profile);`
);

// 3. Add debug for team detection
code = code.replace(
  /const hasValidTeam = profile\.team_id !== null/,
  `console.log('🔍 Checking team_id:', profile.team_id);
    const hasValidTeam = profile.team_id !== null`
);

code = code.replace(
  /setHasGroup\(hasValidTeam\);/,
  `console.log('📊 Setting hasGroup:', hasValidTeam);
    setHasGroup(hasValidTeam);`
);

// 4. Add debug for team details fetch
code = code.replace(
  /const teamResult = await GroupService\.getGroupDetails\(profile\.team_id\);/,
  `console.log('📡 Fetching group details for team:', profile.team_id);
    const teamResult = await GroupService.getGroupDetails(profile.team_id);`
);

code = code.replace(
  /if \(teamResult\.success\) \{/,
  `console.log('📊 Team result:', teamResult);
    if (teamResult.success) {`
);

// 5. Add debug for members fetch
code = code.replace(
  /const membersResult = await GroupService\.getGroupMembers\(profile\.team_id\);/,
  `console.log('📡 Fetching group members...');
    const membersResult = await GroupService.getGroupMembers(profile.team_id);`
);

// 6. Add debug for pending requests
code = code.replace(
  /const requestsResult = await GroupService\.getPendingRequests\(profile\.team_id\);/,
  `console.log('📡 Fetching pending requests...');
    const requestsResult = await GroupService.getPendingRequests(profile.team_id);`
);

// 7. Add debug for errors
code = code.replace(
  /} catch \(error\) \{/,
  `} catch (error) {
    console.error('❌ CRITICAL ERROR in loadGroupData:', error);
    console.error('❌ Error stack:', error.stack);`
);

// 8. Add debug for when no group
code = code.replace(
  /} else \{/,
  `} else {
      console.log('ℹ️ User has no group (team_id is null)');
      setGroupInfo(null);
      setGroupMembers([]);
      setPendingRequests([]);`
);

// 9. Add debug for loading state changes
code = code.replace(
  /setLoading\(true\);/,
  `console.log('⏳ Setting loading to true');
    setLoading(true);`
);

code = code.replace(
  /setLoading\(false\);/g,
  `console.log('✅ Setting loading to false');
    setLoading(false);`
);

// 10. Add error boundary at component level
const errorBoundary = `
  // Error boundary - catch any rendering errors
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    console.log('📱 GroupsScreen mounted');
    return () => console.log('📱 GroupsScreen unmounted');
  }, []);

  // Add error state to UI
  if (renderError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 18, color: '#dc3545', marginBottom: 10 }}>❌ Error Loading Groups</Text>
        <Text style={{ color: '#666', textAlign: 'center', marginHorizontal: 20 }}>{renderError}</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={() => {
            setRenderError(null);
            loadGroupData();
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
`;

// Add error boundary to component
code = code.replace(
  /const GroupsScreen = \({ user, onRefresh }\) => \{/,
  `const GroupsScreen = ({ user, onRefresh }) => {
  ${errorBoundary}`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Debug logs added to GroupsScreen.js');
console.log('');
console.log('📝 Debug logs will appear in the console when you open the Groups tab');
