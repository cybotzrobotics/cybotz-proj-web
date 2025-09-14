#!/bin/bash

# FTC Teams Sync Service Management Script
# Provides easy commands to manage the service on Raspberry Pi

SERVICE_NAME="ftc-teams-sync"
LOG_FILE="/var/log/ftc-teams-sync.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo "FTC Teams Sync Service Manager"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs|tail|enable|disable|install}"
    echo ""
    echo "Commands:"
    echo "  start     - Start the service"
    echo "  stop      - Stop the service"
    echo "  restart   - Restart the service"
    echo "  status    - Show service status"
    echo "  logs      - Show all service logs"
    echo "  tail      - Follow live logs"
    echo "  enable    - Enable service to start on boot"
    echo "  disable   - Disable service from starting on boot"
    echo "  install   - Run the setup script"
    echo ""
}

check_service_exists() {
    if ! systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        echo -e "${RED}❌ Service $SERVICE_NAME is not installed${NC}"
        echo "Run: $0 install"
        exit 1
    fi
}

case "$1" in
    start)
        check_service_exists
        echo -e "${BLUE}🚀 Starting $SERVICE_NAME service...${NC}"
        sudo systemctl start "$SERVICE_NAME"
        sleep 2
        sudo systemctl status "$SERVICE_NAME" --no-pager -l
        ;;
    
    stop)
        check_service_exists
        echo -e "${YELLOW}🛑 Stopping $SERVICE_NAME service...${NC}"
        sudo systemctl stop "$SERVICE_NAME"
        sudo systemctl status "$SERVICE_NAME" --no-pager -l
        ;;
    
    restart)
        check_service_exists
        echo -e "${YELLOW}🔄 Restarting $SERVICE_NAME service...${NC}"
        sudo systemctl restart "$SERVICE_NAME"
        sleep 2
        sudo systemctl status "$SERVICE_NAME" --no-pager -l
        ;;
    
    status)
        check_service_exists
        echo -e "${BLUE}📊 Service status:${NC}"
        sudo systemctl status "$SERVICE_NAME" --no-pager -l
        echo ""
        echo -e "${BLUE}📈 Quick stats:${NC}"
        echo "Enabled: $(systemctl is-enabled $SERVICE_NAME 2>/dev/null || echo 'unknown')"
        echo "Active:  $(systemctl is-active $SERVICE_NAME 2>/dev/null || echo 'unknown')"
        if [ -f "$LOG_FILE" ]; then
            echo "Log size: $(du -h $LOG_FILE | cut -f1)"
            echo "Last log entry: $(tail -1 $LOG_FILE 2>/dev/null | cut -d']' -f1-2])"
        fi
        ;;
    
    logs)
        check_service_exists
        echo -e "${BLUE}📋 Service logs:${NC}"
        sudo journalctl -u "$SERVICE_NAME" --no-pager
        ;;
    
    tail)
        check_service_exists
        echo -e "${BLUE}📡 Following live logs (Ctrl+C to exit):${NC}"
        echo ""
        sudo journalctl -u "$SERVICE_NAME" -f
        ;;
    
    enable)
        check_service_exists
        echo -e "${GREEN}✅ Enabling $SERVICE_NAME to start on boot...${NC}"
        sudo systemctl enable "$SERVICE_NAME"
        systemctl is-enabled "$SERVICE_NAME"
        ;;
    
    disable)
        check_service_exists
        echo -e "${YELLOW}❌ Disabling $SERVICE_NAME from starting on boot...${NC}"
        sudo systemctl disable "$SERVICE_NAME"
        systemctl is-enabled "$SERVICE_NAME" || echo "disabled"
        ;;
    
    install)
        echo -e "${GREEN}🛠️  Running service installation...${NC}"
        if [ -f "./setup-pi-service.sh" ]; then
            sudo ./setup-pi-service.sh
        else
            echo -e "${RED}❌ setup-pi-service.sh not found in current directory${NC}"
            exit 1
        fi
        ;;
    
    ""|help|-h|--help)
        show_help
        ;;
    
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac