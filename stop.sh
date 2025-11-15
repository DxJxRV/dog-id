#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping all Veterinary Platform services...${NC}\n"

# Stop backend (Node.js processes in backend directory)
BACKEND_PIDS=$(lsof -ti:3005)
if [ ! -z "$BACKEND_PIDS" ]; then
    echo -e "${RED}Stopping backend (port 3005)...${NC}"
    kill -9 $BACKEND_PIDS 2>/dev/null
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${YELLOW}No backend process found on port 3005${NC}"
fi

# Stop frontend (Expo processes)
FRONTEND_PIDS=$(ps aux | grep -E "expo start|react-native start" | grep -v grep | awk '{print $2}')
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo -e "${RED}Stopping frontend (Expo)...${NC}"
    echo $FRONTEND_PIDS | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo -e "${YELLOW}No frontend process found${NC}"
fi

# Clean up log files
if [ -f "/tmp/backend.log" ]; then
    rm /tmp/backend.log
fi
if [ -f "/tmp/frontend.log" ]; then
    rm /tmp/frontend.log
fi

echo -e "\n${GREEN}All services stopped!${NC}"
