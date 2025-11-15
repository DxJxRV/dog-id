#!/bin/bash

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Please install it with:"
    echo "  Ubuntu/Debian: sudo apt-get install tmux"
    echo "  macOS: brew install tmux"
    echo ""
    echo "Or use ./start.sh instead"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SESSION_NAME="veterinary-platform"

# Kill existing session if it exists
tmux kill-session -t $SESSION_NAME 2>/dev/null

echo -e "${BLUE}Starting Veterinary Platform in tmux...${NC}\n"
echo -e "${GREEN}Session name: $SESSION_NAME${NC}"
echo -e "${GREEN}Controls:${NC}"
echo -e "  Ctrl+B then D     - Detach (keep running in background)"
echo -e "  Ctrl+B then [     - Scroll mode (q to exit)"
echo -e "  Ctrl+B then Arrow - Switch between panes"
echo -e "  tmux attach       - Reattach to session"
echo -e ""
sleep 2

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create new session with backend
tmux new-session -d -s $SESSION_NAME -n "veterinary"

# Split window horizontally
tmux split-window -h -t $SESSION_NAME

# Run backend in left pane
tmux send-keys -t $SESSION_NAME:0.0 "cd $SCRIPT_DIR/backend && clear && echo 'Starting Backend...' && npm run dev" C-m

# Run frontend in right pane
tmux send-keys -t $SESSION_NAME:0.1 "cd $SCRIPT_DIR/frontend && clear && echo 'Starting Frontend...' && sleep 3 && npm start" C-m

# Attach to session
tmux attach-session -t $SESSION_NAME
