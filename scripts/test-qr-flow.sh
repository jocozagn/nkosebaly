#!/bin/bash
set -e
BASE="http://127.0.0.1:3001"
TOKEN=$(curl -s -X POST "$BASE/api/web-session/create" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "TOKEN=$TOKEN"
curl -s -X POST "$BASE/api/web-session/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"session_token\":\"$TOKEN\",\"device_id\":\"f4657468-e018-48f7-8a96-28f0849b1c6c\"}"
echo ""
curl -s -D /tmp/headers.txt -o /tmp/complete.json -X POST "$BASE/api/web-session/complete" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}"
echo "=== Set-Cookie headers ==="
grep -i set-cookie /tmp/headers.txt || true
echo "=== Body ==="
cat /tmp/complete.json
