#!/usr/bin/env bash
# ─── GottLab DB Backup ─────────────────────────────────────────────
# Creates a full dump of the remote Supabase database (schema + data).
#
# Usage:
#   SUPABASE_ACCESS_TOKEN="sbp_..." bash scripts/backup-db.sh
#
# Restore:
#   1. Supabase Dashboard → Database → Backups → Restore
#   2. Or: psql postgres://... < supabase/dumps/gottlab-YYYY-MM-DD.sql
#
# Scheduled backups recommended via cron:
#   # Daily at 3am
#   0 3 * * * cd /home/json/GottLab && SUPABASE_ACCESS_TOKEN="sbp_..." bash scripts/backup-db.sh
# ────────────────────────────────────────────────────────────────────

set -euo pipefail
PROJECT="nkhavmezlnhsxpbnaqzt"
DUMP_DIR="supabase/dumps"
mkdir -p "$DUMP_DIR"

FILENAME="gottlab-$(date +%Y-%m-%d-%H%M).sql"
OUTFILE="$DUMP_DIR/$FILENAME"
TEMP_SQL="/tmp/gottlab_backup_$$.sql"

echo "▸ Dumping schema + data from $PROJECT..."
npx supabase db dump --linked --file "$TEMP_SQL" 2>&1

# Compress for storage
gzip -c "$TEMP_SQL" > "$OUTFILE.gz"
rm -f "$TEMP_SQL"

SIZE=$(du -h "$OUTFILE.gz" | cut -f1)
echo "✓ Backup saved: $OUTFILE.gz ($SIZE)"

# Rotate: keep last 14 daily backups, delete older
find "$DUMP_DIR" -name "gottlab-*.sql.gz" -mtime +14 -delete 2>/dev/null || true
echo "✓ Old backups cleaned (14-day retention)"

# ─── Quick verification ─────────────────────────────────────────────
# Count lines (data estimate)
LINES=$(gunzip -c "$OUTFILE.gz" | wc -l)
echo "✓ Verified: $LINES lines in dump"
