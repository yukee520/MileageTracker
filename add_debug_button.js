const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// Add a debug button to the Home screen
const debugButton = `
            {/* Debug: Open Groups Tab */}
            <TouchableOpacity 
              style={[styles.startTripBtn, { backgroundColor: '#6f42c1', marginTop: 10 }]}
              onPress={() => {
                console.log('🔘 Debug: Opening Groups tab from Home');
                setActiveTab('groups');
              }}
            >
              <Text style={styles.startTripBtnText}>👥 OPEN GROUPS TAB (DEBUG)</Text>
            </TouchableOpacity>`;

// Add the button after START NEW TRIP button
code = code.replace(
  /<TouchableOpacity[\s\S]*?style={\[styles\.startTripBtn, \(isUsageLimitReached \|\| isTripActive\) && { backgroundColor: '#6c757d' }\]}[\s\S]*?<\/TouchableOpacity>/,
  (match) => `${match}
            ${debugButton}`
);

fs.writeFileSync('App.js', code);
console.log('✅ Added debug button to Home screen');
console.log('');
console.log('📝 A "OPEN GROUPS TAB (DEBUG)" button has been added to the Home screen');
console.log('    Click it to open the Groups tab and see logs in the console');
