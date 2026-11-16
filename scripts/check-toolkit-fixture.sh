#!/usr/bin/env bash
# NFR9: the real Behavioural Design Toolkit must never be committed.
# Fails if any file under fixtures/toolkit is larger than 100 KB, or if any CSV/JSON outside
# fixtures/toolkit carries the toolkit's "Quick Insight Summary" column.
set -euo pipefail
status=0
if [ -d fixtures/toolkit ]; then
  while IFS= read -r f; do
    echo "Too large for an invented fixture (>100 KB): $f"; status=1
  done < <(find fixtures/toolkit -type f -size +100k)
fi
while IFS= read -r f; do
  echo "Looks like a toolkit export outside fixtures/toolkit: $f"; status=1
done < <(git ls-files '*.csv' '*.json' | grep -v '^fixtures/toolkit/' | xargs -r grep -l "Quick Insight Summary" || true)
if [ "$status" -eq 0 ]; then echo "Toolkit fixture check passed."; fi
exit "$status"
