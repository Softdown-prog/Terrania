#!/usr/bin/env bash
set -euo pipefail
umask 077
# Dump only this database. The recipient private key never resides on the VPS.
exec 9>/run/lock/terrania-postgres-backup.lock
flock -n 9 || exit 0
destination=/var/backups/terrania
recipient=/etc/terrania-postgres/backup-recipient.pem
test -d "$destination" && test -r "$recipient"
temporary=$(mktemp -d /run/terrania-postgres-backup.XXXXXX)
cleanup() { rm -f -- "$temporary/dump" "$temporary/encrypted"; rmdir -- "$temporary"; }
trap cleanup EXIT
docker exec -u postgres vps-postgres pg_dump --format=custom --dbname=terrania > "$temporary/dump"
test -s "$temporary/dump"
openssl cms -encrypt -aes-256-gcm -binary -stream -outform DER \
  -recip "$recipient" -in "$temporary/dump" -out "$temporary/encrypted"
name="terrania-$(date -u +%Y%m%dT%H%M%SZ).cms"
chgrp terrania_backup "$temporary/encrypted"
chmod 0640 "$temporary/encrypted"
mv -- "$temporary/encrypted" "$destination/$name"
ln -s -- "$name" "$destination/.latest.next"
mv -Tf -- "$destination/.latest.next" "$destination/latest.cms"
# Retain only this job's encrypted snapshots, never other backups/data.
find "$destination" -maxdepth 1 -type f -name 'terrania-????????T??????Z.cms' -mtime +7 -delete
printf 'Terrania encrypted database backup completed\n'
