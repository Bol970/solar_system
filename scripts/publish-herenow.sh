#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-site}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Directory not found: $TARGET_DIR" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1 || ! command -v file >/dev/null 2>&1; then
  echo "This script requires curl, jq, and file." >&2
  exit 1
fi

if ! command -v sha256sum >/dev/null 2>&1; then
  echo "This script requires sha256sum." >&2
  exit 1
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
WORK_DIR="$(mktemp -d)"
MANIFEST_FILE="$WORK_DIR/manifest.json"
CREATE_RESPONSE="$WORK_DIR/create-response.json"
FINALIZE_RESPONSE="$WORK_DIR/finalize-response.json"

cleanup() {
  rm -rf "$WORK_DIR"
}

trap cleanup EXIT

API_KEY="${HERENOW_API_KEY:-}"

if [[ -z "$API_KEY" && -f "$HOME/.herenow/credentials" ]]; then
  API_KEY="$(tr -d '[:space:]' < "$HOME/.herenow/credentials")"
fi

AUTH_HEADERS=()

if [[ -n "$API_KEY" ]]; then
  AUTH_HEADERS+=(-H "Authorization: Bearer $API_KEY")
fi

manifest_items=()

while IFS= read -r file_path; do
  relative_path="${file_path#$TARGET_DIR/}"
  mime_type="$(file --mime-type -b "$file_path")"
  size_bytes="$(stat -c%s "$file_path")"
  file_hash="$(sha256sum "$file_path" | awk '{print $1}')"

  case "$mime_type" in
    text/*|application/javascript|application/json|image/svg+xml)
      content_type="${mime_type}; charset=utf-8"
      ;;
    *)
      content_type="$mime_type"
      ;;
  esac

  manifest_items+=("$(
    jq -n \
      --arg path "$relative_path" \
      --argjson size "$size_bytes" \
      --arg contentType "$content_type" \
      --arg hash "$file_hash" \
      '{path: $path, size: $size, contentType: $contentType, hash: $hash}'
  )")
done < <(find "$TARGET_DIR" -type f | sort)

printf '%s\n' "${manifest_items[@]}" | jq -s '{
  files: .,
  viewer: {
    title: "Prompt Orbit",
    description: "Three.js practice project published from Codex"
  }
}' > "$MANIFEST_FILE"

curl -sS "https://here.now/api/v1/publish" \
  -H "X-HereNow-Client: codex/publish-sh" \
  -H "content-type: application/json" \
  "${AUTH_HEADERS[@]}" \
  --data-binary "@$MANIFEST_FILE" > "$CREATE_RESPONSE"

site_url="$(jq -r '.siteUrl // empty' "$CREATE_RESPONSE")"
slug="$(jq -r '.slug // empty' "$CREATE_RESPONSE")"
version_id="$(jq -r '.upload.versionId // empty' "$CREATE_RESPONSE")"
finalize_url="$(jq -r '.upload.finalizeUrl // empty' "$CREATE_RESPONSE")"

if [[ -z "$site_url" || -z "$slug" || -z "$version_id" || -z "$finalize_url" ]]; then
  echo "Failed to create here.now upload." >&2
  cat "$CREATE_RESPONSE" >&2
  exit 1
fi

while IFS= read -r upload_item; do
  upload_path="$(jq -r '.path' <<< "$upload_item")"
  upload_url="$(jq -r '.url' <<< "$upload_item")"
  upload_content_type="$(jq -r '.headers["Content-Type"] // .headers["content-type"]' <<< "$upload_item")"

  curl -sS -X PUT "$upload_url" \
    -H "Content-Type: $upload_content_type" \
    --data-binary "@$TARGET_DIR/$upload_path" >/dev/null
done < <(jq -c '.upload.uploads[]?' "$CREATE_RESPONSE")

curl -sS -X POST "$finalize_url" \
  -H "content-type: application/json" \
  "${AUTH_HEADERS[@]}" \
  -d "{\"versionId\":\"$version_id\"}" > "$FINALIZE_RESPONSE"

final_url="$(jq -r '.siteUrl // empty' "$FINALIZE_RESPONSE")"

if [[ -z "$final_url" ]]; then
  echo "Failed to finalize here.now upload." >&2
  cat "$FINALIZE_RESPONSE" >&2
  exit 1
fi

echo "Published successfully"
echo "Site URL: $final_url"

claim_url="$(jq -r '.claimUrl // empty' "$CREATE_RESPONSE")"

if [[ -n "$claim_url" ]]; then
  echo "Claim URL: $claim_url"
  echo "Anonymous site: claim it to keep it permanently."
fi
