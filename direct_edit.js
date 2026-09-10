const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

console.log('🔧 Direct edit of tracking tab end...');

// Look for the specific pattern and replace it
const oldSection = `              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Tab Bar */}`;

const newSection = `              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Tab Bar */}`;

// If the section exists, replace it
if (code.includes(oldSection)) {
  console.log('✅ Found section, replacing with cleaned version');
  code = code.replace(oldSection, newSection);
} else {
  console.log('⚠️ Section not found, looking for alternative...');
  
  // Try a different pattern
  const altPattern = /<\/View>\s*\)}\s*<\/ScrollView>\s*\)}\s*<\/View>\s*{\/\* Bottom Tab Bar \*\/}/;
  if (altPattern.test(code)) {
    console.log('✅ Found alternative pattern');
    code = code.replace(altPattern, '</View>\n            )}\n          </ScrollView>\n        )}\n      </View>\n\n      {/* Bottom Tab Bar */}');
    console.log('✅ Fixed alternative pattern');
  }
}

fs.writeFileSync('App.js', code);
console.log('✅ Direct edit applied');
