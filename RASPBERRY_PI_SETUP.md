# FTC Teams Sync Service for Raspberry Pi

This guide will help you set up a persistent FTC teams synchronization service on your Raspberry Pi that runs continuously in the background.

## Quick Start

1. **Transfer files to your Raspberry Pi:**
   ```bash
   scp -r cybotz-proj-web pi@your-pi-ip:~/
   ```

2. **SSH into your Raspberry Pi:**
   ```bash
   ssh pi@your-pi-ip
   ```

3. **Navigate to the project directory:**
   ```bash
   cd ~/cybotz-proj-web
   ```

4. **Run the setup script:**
   ```bash
   sudo ./scripts/setup-pi-service.sh
   ```

5. **Use the management script for control:**
   ```bash
   ./scripts/manage-service.sh status
   ```

## What This Sets Up

- **Persistent Service**: Runs continuously, even after reboots
- **Automatic Restart**: Restarts automatically if it crashes
- **Smart Syncing**: Rotates through different team number ranges every 6 hours
- **Rate Limiting**: Respects API limits with proper delays
- **Comprehensive Logging**: Both system logs and application logs
- **Resource Management**: Memory limits and security restrictions

## Service Features

### Sync Strategy
- **Interval**: Every 6 hours
- **Team Ranges**: Rotates through different number ranges (1-1000, 1000-3000, etc.)
- **Rate Limiting**: 100ms delay between API calls
- **Batch Processing**: Inserts teams in batches of 10
- **Maximum per Run**: 200 teams per sync to prevent long-running processes

### Error Handling
- **API Retries**: 3 attempts with exponential backoff
- **Database Resilience**: Continues on individual team failures
- **Graceful Shutdown**: Proper cleanup on service stop

## Files Created

### Service Files
- `scripts/teams-sync-service.js` - Main persistent service script
- `scripts/ftc-teams-sync.service` - Systemd service configuration
- `scripts/setup-pi-service.sh` - Automated setup script
- `scripts/manage-service.sh` - Service management commands

### Service Management

Use the management script for easy control:

```bash
# Check service status
./scripts/manage-service.sh status

# Start the service
./scripts/manage-service.sh start

# Stop the service
./scripts/manage-service.sh stop

# Restart the service
./scripts/manage-service.sh restart

# Follow live logs
./scripts/manage-service.sh tail

# View all logs
./scripts/manage-service.sh logs

# Enable/disable auto-start on boot
./scripts/manage-service.sh enable
./scripts/manage-service.sh disable
```

### Manual Service Commands

If you prefer direct systemctl commands:

```bash
# Service control
sudo systemctl start ftc-teams-sync
sudo systemctl stop ftc-teams-sync
sudo systemctl restart ftc-teams-sync
sudo systemctl status ftc-teams-sync

# Enable/disable auto-start
sudo systemctl enable ftc-teams-sync
sudo systemctl disable ftc-teams-sync

# View logs
sudo journalctl -u ftc-teams-sync -f    # Follow live logs
sudo journalctl -u ftc-teams-sync       # View all logs
tail -f /var/log/ftc-teams-sync.log     # App-specific logs
```

## Configuration

### Environment Variables

Create and configure `.env.local`:

```bash
# Required Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Custom sync configuration
SYNC_INTERVAL_HOURS=6
MAX_TEAMS_PER_RUN=200
API_DELAY_MS=100
```

### Service Configuration

The service configuration is in `/etc/systemd/system/ftc-teams-sync.service`:

- **User**: Runs as `pi` user
- **Working Directory**: `/home/pi/cybotz-proj-web`
- **Auto-Restart**: Always restarts on failure
- **Memory Limit**: 512MB maximum
- **Security**: Restricted file system access

## Monitoring

### Service Status
```bash
# Quick status check
./scripts/manage-service.sh status

# Detailed system status
sudo systemctl status ftc-teams-sync --no-pager -l
```

### Logs
```bash
# Live application logs
tail -f /var/log/ftc-teams-sync.log

# System service logs
sudo journalctl -u ftc-teams-sync -f

# Recent logs only
sudo journalctl -u ftc-teams-sync --since "1 hour ago"
```

### Performance
```bash
# Check memory usage
ps aux | grep teams-sync-service

# Check disk usage of logs
du -h /var/log/ftc-teams-sync.log

# Check database growth
# (connect to your Supabase dashboard or run SQL queries)
```

## Troubleshooting

### Service Won't Start
1. Check the logs: `sudo journalctl -u ftc-teams-sync -n 50`
2. Verify environment variables in `.env.local`
3. Check file permissions: `ls -la scripts/teams-sync-service.js`
4. Test manually: `node scripts/teams-sync-service.js`

### High Memory Usage
1. Check current usage: `ps aux | grep teams-sync-service`
2. Reduce `MAX_TEAMS_PER_RUN` in the script
3. Increase sync interval to reduce frequency

### API Rate Limiting
1. Increase `API_DELAY_MS` in the configuration
2. Reduce `MAX_TEAMS_PER_RUN` per sync cycle
3. Check logs for specific error messages

### Database Connection Issues
1. Verify Supabase credentials in `.env.local`
2. Check network connectivity: `ping your-project.supabase.co`
3. Test database connection manually with a simple script

## Customization

### Changing Sync Frequency
Edit `scripts/teams-sync-service.js` and modify:
```javascript
const CONFIG = {
  syncInterval: 3 * 60 * 60 * 1000, // 3 hours instead of 6
  // ... other config
}
```

### Modifying Team Ranges
Edit the `ranges` array in `performSync()` function:
```javascript
const ranges = [
  [1, 500],      // Smaller ranges
  [500, 1000],
  [1000, 2000],
  // ... add more ranges
]
```

### Adding Custom Logic
The service script is modular - you can add:
- Custom team validation logic
- Additional data enrichment
- Integration with other APIs
- Custom notification systems

## Security Considerations

- Service runs with limited privileges
- Environment variables are protected (600 permissions)
- No network access outside of required APIs
- Temporary file restrictions in place
- Memory limits prevent resource exhaustion

## Performance Expectations

- **Team Discovery Rate**: ~100-200 teams per hour (varies by range)
- **Memory Usage**: ~50-100MB during operation
- **CPU Usage**: Very low (~1-2% on Raspberry Pi 4)
- **Network Usage**: Minimal (only API calls)
- **Storage**: Log files grow ~1-2MB per day

## Backup and Recovery

### Backing Up Configuration
```bash
# Backup your configuration
tar -czf ftc-sync-backup.tar.gz .env.local scripts/
```

### Service Recovery
```bash
# If service gets corrupted, reinstall:
sudo systemctl stop ftc-teams-sync
sudo systemctl disable ftc-teams-sync
sudo rm /etc/systemd/system/ftc-teams-sync.service
sudo ./scripts/setup-pi-service.sh
```

## Support

If you encounter issues:

1. Check the logs first: `./scripts/manage-service.sh logs`
2. Test the base sync script: `node scripts/sync_teams_graphql.js`
3. Verify Supabase connectivity manually
4. Check Raspberry Pi system resources: `top`, `df -h`, `free -h`

The service is designed to be robust and self-healing, but monitoring the logs will help identify any systemic issues.