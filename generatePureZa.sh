#!/bin/bash

# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

# Function to cleanly exit
cleanup() {
    echo "Terminating background processes..."
    curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null;
    kill $pid4
    exit 0
}

# Trap SIGINT (Ctrl+C) to execute the cleanup function
trap cleanup SIGINT

# Simulate a user requesting the menu every 3 seconds


# Simulate a diner ordering a pizza every 20 seconds
response=$(curl -s -X PUT $host/api/auth -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json');
token=$(echo $response | jq -r '.token');
while true
do
  curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId":io 1, "storeId":1, "items":[{ "menuId": 1, "descriptn": "Veggie", "price": 0.05 }]}'  -H "Authorization: Bearer $token" > /dev/null;
  echo "Cooking the books ...."
  sleep 2;
done &
pid4=$!


# Wait for the background processes to complete
wait $pid4
