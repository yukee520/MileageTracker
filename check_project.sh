#!/bin/bash

echo "========================================="
echo "  MILEAGE TRACKER - PROJECT STRUCTURE"
echo "========================================="
echo ""

echo "📁 PROJECT ROOT:"
ls -la | grep -E "App.js|app.json|package.json|.env|eas.json" | awk '{print $9}' | sed 's/^/  - /'

echo ""
echo "📁 COMPONENTS:"
if [ -d "components" ]; then
  ls -la components/ | grep -E ".js$|.jsx$" | awk '{print "  - " $9}'
else
  echo "  ❌ components/ folder not found"
fi

echo ""
echo "📁 SERVICES:"
if [ -d "services" ]; then
  ls -la services/ | grep -E ".js$" | awk '{print "  - " $9}'
else
  echo "  ❌ services/ folder not found"
fi

echo ""
echo "📁 SCREENS:"
if [ -d "screens" ]; then
  ls -la screens/ | grep -E ".js$|.jsx$" | awk '{print "  - " $9}'
else
  echo "  ℹ️  No screens/ folder (may use App.js for screens)"
fi

echo ""
echo "📁 ASSETS:"
if [ -d "assets" ]; then
  ls -la assets/ | head -10 | awk '{print "  - " $9}'
else
  echo "  ℹ️  No assets/ folder"
fi

echo ""
echo "========================================="
echo "  CHECKING FOR PAYMENT FILES"
echo "========================================="

# Check for payment-related files
echo ""
echo "🔍 Payment-related files found:"
find . -type f -name "*.js" -o -name "*.jsx" | grep -i "payment\|toyyib\|stripe\|bill" | grep -v node_modules | while read file; do
  echo "  - $file"
done

echo ""
echo "🔍 Check if PaymentModal exists in App.js:"
if [ -f "App.js" ]; then
  if grep -q "PaymentModal" App.js; then
    echo "  ✅ PaymentModal is imported in App.js"
  else
    echo "  ❌ PaymentModal not found in App.js"
  fi
fi

echo ""
echo "========================================="
echo "  KEY CONFIGURATION FILES"
echo "========================================="

# Check app.json
if [ -f "app.json" ]; then
  echo ""
  echo "📄 app.json - Plugins:"
  grep -A 2 '"plugins"' app.json | head -10
fi

# Check .env
if [ -f ".env" ]; then
  echo ""
  echo "📄 .env - Environment variables (keys hidden):"
  grep -v "^#" .env | sed 's/=.*/=****/' 2>/dev/null | head -5
else
  echo ""
  echo "ℹ️  No .env file found (check .env.example or .env.local)"
fi

echo ""
echo "========================================="
echo "  NEXT STEPS"
echo "========================================="
echo ""
echo "1. If PaymentModal.js is missing, you need to create it"
echo "2. If ToyyibPayService.js is missing, you need to create it"
echo "3. Check App.js for group plan handling"
echo "4. Verify app.json has the payment deep link"
echo ""

