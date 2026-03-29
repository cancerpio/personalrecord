sleep 1
echo "--- Testing POST /api/v1/sessions ---"
RES1=$(curl -s -X POST http://localhost:3001/api/v1/sessions -H "Authorization: Bearer fake-liff-token" -H "Content-Type: application/json" -d '{"exercise":"Bench Press","weight":85,"reps":10,"date":"2026-03-29"}')
echo $RES1
DOC_ID=$(echo $RES1 | grep -o '"docId":"[^"]*' | cut -d'"' -f4)
echo "Created DocID: $DOC_ID"

echo "--- Testing GET /api/v1/sessions ---"
curl -s -H "Authorization: Bearer fake-liff-token" http://localhost:3001/api/v1/sessions

if [ ! -z "$DOC_ID" ]; then
  echo "--- Testing PUT /api/v1/sessions/:id ---"
  curl -s -X PUT http://localhost:3001/api/v1/sessions/$DOC_ID -H "Authorization: Bearer fake-liff-token" -H "Content-Type: application/json" -d '{"exercise":"Bench Press","weight":90,"reps":8,"date":"2026-03-29"}'

  echo ""
  echo "--- Testing DELETE /api/v1/sessions/:id ---"
  curl -s -X DELETE http://localhost:3001/api/v1/sessions/$DOC_ID -H "Authorization: Bearer fake-liff-token"
fi

echo ""
echo "--- Testing POST /api/v1/body-metrics ---"
curl -s -X POST http://localhost:3001/api/v1/body-metrics -H "Authorization: Bearer fake-liff-token" -H "Content-Type: application/json" -d '{"date":"2026-03-29","fatPercentage":18.5,"bodyWeight":75}'

echo ""
echo "--- Testing GET /api/v1/body-metrics ---"
curl -s -H "Authorization: Bearer fake-liff-token" http://localhost:3001/api/v1/body-metrics

echo ""
echo "--- Verifying MongoDB directly ---"
docker exec local-mongo mongosh -u devuser -p devpassword --authenticationDatabase admin --quiet --eval '
print("Sessions in DB: " + db.getSiblingDB("personalrecord").getCollection("training_sessions").countDocuments({}));
print("Body Metrics in DB: " + db.getSiblingDB("personalrecord").getCollection("body_metrics").countDocuments({}));
'

echo "--- Testing DELETE /api/v1/body-metrics/:date ---"
curl -s -X DELETE http://localhost:3001/api/v1/body-metrics/2026-03-29 -H "Authorization: Bearer fake-liff-token"

echo ""
echo "--- Final MongoDB Verification ---"
docker exec local-mongo mongosh -u devuser -p devpassword --authenticationDatabase admin --quiet --eval '
print("Sessions in DB: " + db.getSiblingDB("personalrecord").getCollection("training_sessions").countDocuments({}));
print("Body Metrics in DB: " + db.getSiblingDB("personalrecord").getCollection("body_metrics").countDocuments({}));
'
