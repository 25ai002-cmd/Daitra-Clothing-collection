#!/bin/sh
echo "==================================================="
echo "    DAITRA Couture — Starting Application Server"
echo "==================================================="
echo ""

if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies..."
    npm install
else
    echo "[1/3] Dependencies found."
fi

echo ""
echo "[2/3] Building production assets with Vite..."
npm run build

echo ""
echo "[3/3] Starting Express Server at http://localhost:10000 ..."
echo "Press Ctrl+C to stop."
echo ""

node server.js
