#!/bin/bash

# Daily FTC Teams Sync Setup Script
# This script helps set up automated daily syncing of FTC teams data

PROJECT_DIR="/home/aarya-raut/web-proejcts/cybotz-proj-web"
SCRIPT_PATH="$PROJECT_DIR/scripts/sync_ftc_teams.js"
LOG_DIR="$PROJECT_DIR/logs"
CRON_FILE="/tmp/cybotz_cron"

echo "🚀 Setting up daily FTC teams sync automation..."

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Create log file for sync operations
touch "$LOG_DIR/team_sync.log"

echo "📁 Created log directory: $LOG_DIR"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "sync_ftc_teams.js"; then
    echo "⚠️  Cron job for FTC teams sync already exists!"
    echo "Current cron jobs:"
    crontab -l | grep sync_ftc_teams.js
else
    # Create new cron job entry
    echo "📅 Setting up daily cron job (runs at 2:00 AM every day)..."
    
    # Get existing cron jobs
    crontab -l 2>/dev/null > "$CRON_FILE"
    
    # Add new cron job
    echo "# Daily FTC Teams Sync - runs at 2:00 AM" >> "$CRON_FILE"
    echo "0 2 * * * cd $PROJECT_DIR && /usr/bin/node $SCRIPT_PATH >> $LOG_DIR/team_sync.log 2>&1" >> "$CRON_FILE"
    
    # Install the cron job
    crontab "$CRON_FILE"
    
    # Clean up temp file
    rm "$CRON_FILE"
    
    echo "✅ Daily sync cron job installed successfully!"
fi

echo ""
echo "📋 Setup Summary:"
echo "  - Sync script: $SCRIPT_PATH"
echo "  - Log file: $LOG_DIR/team_sync.log"
echo "  - Schedule: Daily at 2:00 AM"
echo ""
echo "🔧 Manual Commands:"
echo "  - Run sync now: cd $PROJECT_DIR && node scripts/sync_ftc_teams.js"
echo "  - View logs: tail -f $LOG_DIR/team_sync.log"
echo "  - List cron jobs: crontab -l"
echo "  - Remove cron job: crontab -e (then delete the sync_ftc_teams.js line)"
echo ""
echo "⚡ To test the sync script now, run:"
echo "  cd $PROJECT_DIR && node scripts/sync_ftc_teams.js"
