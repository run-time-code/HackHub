#!/usr/bin/env bash
set -euo pipefail

: "${MONGODB_URI:?Set MONGODB_URI to the source database}"
: "${RESTORE_MONGODB_URI:?Set RESTORE_MONGODB_URI to an isolated restore database}"
: "${RESTORE_TARGET_CONFIRMATION:?Set RESTORE_TARGET_CONFIRMATION=isolated-non-production}"

if [[ "$RESTORE_TARGET_CONFIRMATION" != "isolated-non-production" ]]; then
  echo "Refusing restore: confirm the target is isolated and non-production." >&2
  exit 1
fi
if [[ "$MONGODB_URI" == "$RESTORE_MONGODB_URI" ]]; then
  echo "Refusing restore: source and restore URIs must differ." >&2
  exit 1
fi

for command in mongodump mongorestore mongosh sha256sum; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 1; }
done

backup_dir="${BACKUP_DIR:-/tmp/hackhub-backups}"
mkdir -p "$backup_dir"
archive="$backup_dir/hackhub-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
source_db="$(mongosh "$MONGODB_URI" --quiet --eval 'db.getName()')"
restore_db="$(mongosh "$RESTORE_MONGODB_URI" --quiet --eval 'db.getName()')"

# mongorestore treats a database path in --uri as an implicit --db, and
# --db + --nsFrom/--nsTo filters every collection out: the restore then
# "succeeds" while writing 0 documents. --nsTo already renames the target,
# so hand mongorestore a host-only URI.
host_uri() {
    local uri="$1"
    local scheme="${uri%%://*}"
    local rest="${uri#*://}"
    local authority="${rest%%/*}"
    if [[ "$rest" == "$authority" ]]; then
        printf '%s' "$uri"
        return
    fi
    local after="${rest#*/}"
    if [[ "$after" == *"?"* ]]; then
        printf '%s://%s/?%s' "$scheme" "$authority" "${after#*\?}"
    else
        printf '%s://%s' "$scheme" "$authority"
    fi
}
if [[ "$source_db" == "$restore_db" ]]; then
  echo "Refusing restore: use a distinct restore database name." >&2
  exit 1
fi

inventory() {
  mongosh "$1" --quiet --eval '
    const names = db.getCollectionNames().filter((name) => !name.startsWith("system.")).sort();
    const counts = names.map((name) => [name, db.getCollection(name).countDocuments()]);
    print(JSON.stringify(counts));
  '
}

before="$(inventory "$MONGODB_URI")"
mongodump --uri="$MONGODB_URI" --archive="$archive" --gzip
sha256sum "$archive"
mongorestore --uri="$(host_uri "$RESTORE_MONGODB_URI")" --archive="$archive" --gzip --drop \
  --nsFrom="${source_db}.*" --nsTo="${restore_db}.*"
after="$(inventory "$RESTORE_MONGODB_URI")"

if [[ "$before" != "$after" ]]; then
  echo "Restore verification failed: collection counts differ from the source inventory." >&2
  echo "Source:  $before" >&2
  echo "Restore: $after" >&2
  exit 1
fi

echo "Backup and isolated restore verified: $archive"