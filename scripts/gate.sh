#!/usr/bin/env bash
set -euo pipefail

echo "=== Gate Check ==="
echo ""

# Vitest
echo "--- vitest ---"
npx vitest run 2>&1 | tail -5
echo ""

# Build
echo "--- build ---"
npm run build 2>&1 | tail -3
echo ""

# Checks
echo "--- checks ---"
test -f dist/admin/config.yml && echo "PASS: dist/admin/config.yml present" || { echo "FAIL: dist/admin/config.yml missing"; exit 1; }
test ! -f public/admin/config.yml && echo "PASS: public/admin/config.yml absent" || { echo "FAIL: public/admin/config.yml exists"; exit 1; }
COUNT=$(grep -c editorial_workflow dist/admin/config.yml 2>/dev/null || echo 0)
[ "$COUNT" -eq 0 ] && echo "PASS: editorial_workflow count = 0" || { echo "FAIL: editorial_workflow count = $COUNT"; exit 1; }

echo ""
echo "=== All gates passed ==="
