#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Veterinary Platform - Starting...${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PIDs to track
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"

    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${RED}Stopping backend (PID: $BACKEND_PID)${NC}"
        kill $BACKEND_PID 2>/dev/null
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${RED}Stopping frontend (PID: $FRONTEND_PID)${NC}"
        kill $FRONTEND_PID 2>/dev/null
    fi

    echo -e "${GREEN}All services stopped. Goodbye!${NC}"
    exit 0
}

# Trap CTRL+C and other termination signals
trap cleanup SIGINT SIGTERM

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found!${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found!${NC}"
    exit 1
fi

# Start Backend
echo -e "${GREEN}[1/2] Starting Backend...${NC}"
cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend started successfully (PID: $BACKEND_PID)${NC}"
    echo -e "${BLUE}  Local: http://localhost:3005${NC}"
    echo -e "${BLUE}  Network: http://192.168.100.171:3005${NC}"
else
    echo -e "${RED}✗ Backend failed to start. Check logs: /tmp/backend.log${NC}"
    exit 1
fi

# Start Frontend
echo -e "\n${GREEN}[2/2] Starting Frontend...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 3

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}✗ Frontend failed to start. Check logs: /tmp/frontend.log${NC}"
    cleanup
    exit 1
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All services running!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\n${GREEN}Backend URLs:${NC}"
echo -e "  Local:   http://localhost:3005"
echo -e "  Network: http://192.168.100.171:3005"
echo -e "\n${GREEN}Frontend:${NC} Scan QR code with Expo Go"
echo -e "\n${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f /tmp/backend.log"
echo -e "  Frontend: tail -f /tmp/frontend.log"
echo -e "\n${RED}Press CTRL+C to stop all services${NC}\n"

# Keep script running and show backend logs
tail -f /tmp/backend.log /tmp/frontend.log
