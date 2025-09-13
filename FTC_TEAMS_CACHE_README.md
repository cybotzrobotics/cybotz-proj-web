# FTC Teams Cache System

This system provides fast, reliable team search functionality by caching FTC team data locally and syncing it daily from external APIs.

## Features

✅ **Fast Team Search**: Instant search from local database cache  
✅ **API Fallback**: Automatically searches external APIs if no cached results  
✅ **Daily Sync**: Keeps team data fresh with automated updates  
✅ **Unified Login/Signup**: Single component handles both auth flows  
✅ **Team Selection UI**: Enhanced dropdown with team details  

## Quick Start

### 1. Database Setup

Apply the database schema (if not already done):

```bash
# Run the database setup SQL
psql -h your-db-host -U your-user -d your-db -f database/database_ftc_teams_cache.sql
```

### 2. Environment Variables

Ensure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional but recommended
```

### 3. Initial Team Data Sync

```bash
# Install dependencies
npm install @supabase/supabase-js dotenv

# Run initial sync
cd /home/aarya-raut/web-proejcts/cybotz-proj-web
node scripts/sync_ftc_teams.js
```

### 4. Set Up Daily Automation

```bash
# Set up daily sync (runs at 2 AM)
./scripts/setup_daily_sync.sh
```

## File Structure

```
database/
  database_ftc_teams_cache.sql     # Database schema and functions

scripts/
  sync_ftc_teams.js               # Main sync script
  setup_teams_cache.js            # Setup and validation
  setup_daily_sync.sh             # Cron job setup

src/components/
  TeamSearch.tsx                  # Enhanced team search component
  LoginTeam.tsx                   # Unified login/signup component

src/app/login/
  page.tsx                        # Updated login page
```

## How It Works

### Team Search Flow

1. **User types team name/number** → TeamSearch component
2. **Database search first** → Uses `search_teams()` RPC function
3. **API fallback if needed** → FTCScout → The Orange Alliance
4. **Live dropdown results** → User selects their team
5. **Team data saved** → Used in registration process

### Daily Sync Process

1. **Cron job triggers** at 2:00 AM daily
2. **Fetch from APIs** → The Orange Alliance (primary), FTCScout (backup)
3. **Batch processing** → 1000 teams per batch for performance
4. **Upsert to database** → Update existing, insert new teams
5. **Logging** → Results logged to `logs/team_sync.log`

## Database Schema

### `ftc_teams` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `team_number` | INTEGER | FTC team number (unique) |
| `team_name` | TEXT | Full team name |
| `team_name_short` | TEXT | Short team name |
| `city` | TEXT | Team city |
| `state_prov` | TEXT | State/Province |
| `country` | TEXT | Country |
| `last_updated` | TIMESTAMPTZ | Last sync time |
| `created_at` | TIMESTAMPTZ | Record creation time |

### Functions

- `search_teams(search_term TEXT)` - Fast full-text search
- `get_team_info(team_num INTEGER)` - Get team by number

## Usage Examples

### Search Component

```tsx
import TeamSearch from '@/components/TeamSearch';

function MyComponent() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  return (
    <TeamSearch
      onTeamSelect={setSelectedTeam}
      selectedTeam={selectedTeam}
      placeholder="Find your FTC team..."
    />
  );
}
```

### Manual Sync

```bash
# Run sync manually
node scripts/sync_ftc_teams.js

# Test database connection
node scripts/setup_teams_cache.js

# View sync logs
tail -f logs/team_sync.log
```

## API Sources

1. **The Orange Alliance** (Primary)
   - URL: `https://theorangealliance.org/api/team`
   - More reliable, better data quality

2. **FTCScout** (Fallback)
   - URL: `https://ftcscout.org/api/teams/search`
   - Used when Orange Alliance fails

## Monitoring

### Check Sync Status

```bash
# View recent sync logs
tail -20 logs/team_sync.log

# Check team count in database
psql -c "SELECT COUNT(*) FROM ftc_teams;"

# Check last sync time
psql -c "SELECT MAX(last_updated) FROM ftc_teams;"
```

### Cron Job Management

```bash
# List current cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Remove all cron jobs
crontab -r
```

## Performance

- **Search speed**: ~10-50ms (database) vs 2-5 seconds (API)
- **Storage**: ~2MB for all FTC teams
- **Sync time**: ~2-5 minutes for full refresh
- **API rate limits**: Handled with delays and retries

## Troubleshooting

### No Search Results

1. Check if teams table has data: `SELECT COUNT(*) FROM ftc_teams;`
2. Run manual sync: `node scripts/sync_ftc_teams.js`
3. Check API connectivity in browser

### Sync Failures

1. Check environment variables in `.env.local`
2. Verify database permissions
3. Check API status:
   - https://theorangealliance.org/api/team (should return JSON)
   - https://ftcscout.org/api/teams/search?q=test

### Cron Job Not Running

1. Check cron service: `sudo systemctl status cron`
2. Verify cron job exists: `crontab -l`
3. Check logs: `tail -f logs/team_sync.log`
4. Test script manually: `node scripts/sync_ftc_teams.js`

## Security Notes

- Uses Row Level Security (RLS) for database access
- Public read access for team data (needed for registration)
- Service role key recommended for sync operations
- No sensitive team data is cached

## Future Enhancements

- [ ] Regional/state filtering
- [ ] Team statistics caching
- [ ] Season-specific data
- [ ] Advanced search filters
- [ ] Webhook-based updates
