#!/bin/bash
# Bugout Monitor — Install cron job (Linux/macOS)
# Runs daily at 6:00 AM

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

CRON_CMD="0 6 * * * cd $PROJECT_DIR && node monitor/index.js >> monitor/logs/scheduler.log 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "bugout-monitor"; then
    echo "Bugout Monitor cron job already exists. Replacing..."
    crontab -l 2>/dev/null | grep -v "bugout-monitor" | crontab -
fi

# Add the cron job
(crontab -l 2>/dev/null; echo "$CRON_CMD # bugout-monitor") | crontab -

echo "✓ Cron job installed. Bugout Monitor will run daily at 6:00 AM."
echo ""
echo "To verify:  crontab -l"
echo "To remove:  crontab -l | grep -v bugout-monitor | crontab -"
echo "To run now: cd $PROJECT_DIR && node monitor/index.js"
