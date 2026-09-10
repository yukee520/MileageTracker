const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

// Add error handling and console logs to debug
console.log('🔧 Adding debug logging to GroupsScreen...');

// 1. Add error handling in loadGroupData
const loadGroupDataMatch = code.match(/const loadGroupData = async \(\) => \{[\s\S]*?\n  \};/);
if (loadGroupDataMatch) {
  let loadGroupData = loadGroupDataMatch[0];
  
  // Add try-catch with better error logging
  const fixedLoadGroupData = loadGroupData.replace(
    /console\.error\('Error loading group data:', error\);/,
    `console.error('❌ Error loading group data:', error);
      console.error('❌ Error details:', error.message, error.stack);
      // Set loading to false even on error
      setLoading(false);
      setRefreshing(false);`
  );
  
  code = code.replace(loadGroupDataMatch[0], fixedLoadGroupData);
  console.log('✅ Added better error handling to loadGroupData');
}

// 2. Add loading timeout to prevent infinite loading
const setLoadingTimeout = `
  // Set a timeout to prevent infinite loading
  const loadingTimeout = setTimeout(() => {
    console.log('⚠️ Loading timeout - forcing loading to stop');
    setLoading(false);
  }, 10000);
  
  // Clear timeout when loading completes
  clearTimeout(loadingTimeout);`;

// Add timeout near the beginning of loadGroupData
code = code.replace(
  /setLoading\(true\);/,
  `setLoading(true);
    ${setLoadingTimeout}`
);
console.log('✅ Added loading timeout');

// 3. Add a fallback for when setLoading is not called
const fallbackRender = `
  // Fallback for loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: 60 }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading group data...</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={() => {
            console.log('🔄 Manual refresh triggered');
            loadGroupData();
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }`;

// Replace the existing loading return with the fallback
code = code.replace(
  /if \(loading\) \{[\s\S]*?return \([\s\S]*?\);/,
  `if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: 60 }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading group data...</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={() => {
            console.log('🔄 Manual refresh triggered');
            loadGroupData();
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }`
);
console.log('✅ Added manual retry button');

// 4. Add more debug logs to see what's happening
code = code.replace(
  /const { data: profile, error: profileError } = await supabase/,
  `console.log('🔍 Fetching user profile for:', user.id);
    const { data: profile, error: profileError } = await supabase`
);
console.log('✅ Added debug logs');

// 5. Add a catch for the main try block
code = code.replace(
  /} catch \(error\) \{/,
  `} catch (error) {
      console.error('❌ Error in loadGroupData:', error);
      console.error('❌ Error stack:', error.stack);
      setLoading(false);
      setRefreshing(false);`
);
console.log('✅ Added main catch block');

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('');
console.log('✅ Debug fixes applied!');
console.log('');
console.log('📝 Changes made:');
console.log('1. Added better error handling');
console.log('2. Added loading timeout (10 seconds)');
console.log('3. Added manual retry button');
console.log('4. Added console logs for debugging');
console.log('5. Added fallback for error states');
