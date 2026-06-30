#!/usr/bin/env bash
# Startup for the Hugging Face Space container. Generates a throwaway signing
# secret if none was provided, seeds the content database into the (ephemeral)
# writable dir, then serves the app on the port HF expects.
set -e

# A real secret so JWTs aren't signed with the published dev default. If the
# operator set SECRET_KEY in the Space settings we keep theirs; otherwise we
# mint a random one per boot (sessions reset on restart — fine for a trial).
export SECRET_KEY="${SECRET_KEY:-$(python -c 'import secrets; print(secrets.token_hex(32))')}"
export SANDBOX_ALLOW_LOCAL_FALLBACK=true

# Build the content database if this container doesn't have one yet. HF storage
# is ephemeral, so a fresh container re-seeds from seed/ on first boot.
if [ ! -f alldata.db ]; then
  echo "Seeding content database..."
  python -m seed.import_seed || echo "WARN: seeding hit an error; starting anyway."
fi

exec uvicorn backend.main:app --host 0.0.0.0 --port 7860
