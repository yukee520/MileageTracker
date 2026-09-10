const fs = require('fs');
let code = fs.readFileSync('components/GroupsScreen.js', 'utf8');

console.log('🔧 Adding notification sound/vibration...');

// Add Vibration import if not present
if (!code.includes('import { Vibration }')) {
  code = code.replace(
    /import \{[^}]*\} from 'react-native';/,
    `import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Share,
  Vibration
} from 'react-native';`
  );
  console.log('✅ Added Vibration import');
}

// Add vibration on new request
code = code.replace(
  /console\.log\('🆕 New join request detected!', payload\);/,
  `console.log('🆕 New join request detected!', payload);
        
        // Vibrate to notify
        Vibration.vibrate(500);`
);

fs.writeFileSync('components/GroupsScreen.js', code);
console.log('✅ Added vibration notification');
