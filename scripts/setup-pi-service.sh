#!/bin/bash

# Setup script for FTC Teams Sync Service on Raspberry Pi
# Run this script on your Raspberry Pi to install and configure the service

set -e

echo "🚀 Setting up FTC Teams Sync Service on Raspberry Pi..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/pi/cybotz-proj-web"
SERVICE_NAME="ftc-teams-sync"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
LOG_FILE="/var/log/ftc-teams-sync.log"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root for some operations
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script needs to be run with sudo for system service installation"
        echo "Usage: sudo ./setup-pi-service.sh"
        exit 1
    fi
}

# Step 1: Check prerequisites
log_info "Step 1: Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory $PROJECT_DIR does not exist"
    echo "Please clone your project to $PROJECT_DIR first:"
    echo "  cd /home/pi"
    echo "  git clone <your-repo-url> cybotz-proj-web"
    exit 1
fi

log_info "Project directory found: $PROJECT_DIR"

# Step 2: Install dependencies
log_info "Step 2: Installing Node.js dependencies..."
cd "$PROJECT_DIR"

if [ ! -f "package.json" ]; then
    log_error "package.json not found in $PROJECT_DIR"
    exit 1
fi

# Install dependencies as pi user
sudo -u pi npm install
log_info "Dependencies installed"

# Step 3: Check environment variables
log_info "Step 3: Checking environment configuration..."

ENV_FILE="$PROJECT_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    log_warn ".env.local file not found. Creating template..."
    
    cat > "$ENV_FILE" << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Custom sync configuration
# SYNC_INTERVAL_HOURS=6
# MAX_TEAMS_PER_RUN=200
# API_DELAY_MS=100
EOF
    
    chown pi:pi "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    
    log_warn "Please edit $ENV_FILE with your actual Supabase credentials"
    log_warn "Then run this script again"
    exit 1
fi

# Check if required environment variables are set
if grep -q "your_supabase_url_here" "$ENV_FILE"; then
    log_error "Please update the environment variables in $ENV_FILE"
    exit 1
fi

log_info "Environment file configured"

# Step 4: Create log file
log_info "Step 4: Setting up logging..."

# Create log file with proper permissions
touch "$LOG_FILE"
chown pi:pi "$LOG_FILE"
chmod 644 "$LOG_FILE"

log_info "Log file created: $LOG_FILE"

# Step 5: Install systemd service
log_info "Step 5: Installing systemd service..."

# Copy service file
cp "$PROJECT_DIR/scripts/ftc-teams-sync.service" "$SERVICE_FILE"

# Update paths in service file if needed
sed -i "s|/home/pi/cybotz-proj-web|$PROJECT_DIR|g" "$SERVICE_FILE"

# Reload systemd
systemctl daemon-reload

log_info "Service file installed: $SERVICE_FILE"

# Step 6: Start and enable service
log_info "Step 6: Starting service..."

# Enable service to start on boot
systemctl enable "$SERVICE_NAME"

# Start the service
systemctl start "$SERVICE_NAME"

# Check service status
sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
    log_info "✅ Service started successfully!"
else
    log_error "❌ Service failed to start"
    echo "Check logs with: sudo journalctl -u $SERVICE_NAME -f"
    exit 1
fi

# Step 7: Display status and instructions
log_info "Step 7: Setup complete!"

echo ""
echo "🎉 FTC Teams Sync Service is now running!"
echo ""
echo "📊 Service Commands:"
echo "  Start:   sudo systemctl start $SERVICE_NAME"
echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
echo "  Restart: sudo systemctl restart $SERVICE_NAME"
echo "  Status:  sudo systemctl status $SERVICE_NAME"
echo "  Disable: sudo systemctl disable $SERVICE_NAME"
echo ""
echo "📋 Monitoring:"
echo "  Live logs:     sudo journalctl -u $SERVICE_NAME -f"
echo "  Service logs:  sudo journalctl -u $SERVICE_NAME"
echo "  App log file:  tail -f $LOG_FILE"
echo ""
echo "🔧 Configuration:"
echo "  Environment:   $ENV_FILE"
echo "  Service file:  $SERVICE_FILE"
echo "  Project dir:   $PROJECT_DIR"
echo ""

# Show current status
log_info "Current service status:"
systemctl status "$SERVICE_NAME" --no-pager -l

echo ""
log_info "Setup completed successfully! The service will sync FTC teams every 6 hours."