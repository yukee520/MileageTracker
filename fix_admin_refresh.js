const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.js', 'utf8');

console.log('🔧 Adding auto-refresh after tier update...');

// Find the handleUpdateSubscription function and add refresh
const updateMatch = code.match(/const handleUpdateSubscription = async \(\) => \{[\s\S]*?Alert\.alert\('Success', `Subscription updated successfully for \$\{editingUser\.full_name \|\| editingUser\.email\}`\);\s+setShowEditModal\(false\);\s+setEditingUser\(null\);\s+loadData\(\);\s+\}/);

if (updateMatch) {
  console.log('✅ Found handleUpdateSubscription');
  
  // Add a refresh callback to also update the main app data
  const newUpdate = updateMatch[0].replace(
    /loadData\(\);/,
    `loadData();
      // Also refresh the main app data
      if (onRefresh) onRefresh();`
  );
  
  code = code.replace(updateMatch[0], newUpdate);
  console.log('✅ Added auto-refresh after tier update');
}

// Also add the onRefresh prop to AdminPanel
if (!code.includes('onRefresh')) {
  console.log('⚠️ onRefresh prop not found, adding it');
  code = code.replace(
    /const AdminPanel = \({ user, onClose }\) => \{/,
    'const AdminPanel = ({ user, onClose, onRefresh }) => {'
  );
}

fs.writeFileSync('components/AdminPanel.js', code);
console.log('✅ AdminPanel auto-refresh fix applied');
