#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Planner Content Sync for your MacBook
#  Watches ~/Content/<account> folders and adds every NEW video, image or
#  folder of images to the Queue on your planner website.
#  • Your files never leave your Mac (only the NAME is sent).
#  • Deleting a file later does NOT remove it from the sheet.
#  Run:  bash ~/Downloads/install-content-sync.command
#  Uninstall:  bash ~/Downloads/install-content-sync.command --uninstall
# ─────────────────────────────────────────────────────────────────────────────
set -e
SITE_DEFAULT="https://planner-sable-five.vercel.app"
APP_DIR="$HOME/Library/Application Support/PlannerSync"
PLIST="$HOME/Library/LaunchAgents/com.planner.contentsync.plist"
ROOT="$HOME/Content"
ACCOUNTS=("Life with C - Instagram" "Life with C - TikTok" "Life with C - YouTube" "Ane Manda - Instagram" "Ane Manda - Facebook" "Ane Manda - TikTok" "Ane Manda - YouTube")

if [ "$1" = "--uninstall" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"; rm -rf "$APP_DIR"
  echo "✅ Content Sync removed. Your ~/Content folder and your sheet were not touched."
  exit 0
fi

echo ""
echo "🎬 Planner Content Sync setup"
echo ""
read -r -p "Website address [$SITE_DEFAULT]: " SITE
SITE="${SITE:-$SITE_DEFAULT}"; SITE="${SITE%/}"
case "$SITE" in http*) ;; *) SITE="https://$SITE" ;; esac
echo "Paste your CRON_SECRET (the same value you put in Vercel). It won't show while you paste:"
read -r -s KEY; echo ""
[ -z "$KEY" ] && { echo "❌ No key entered. Run me again."; exit 1; }

mkdir -p "$APP_DIR" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
for a in "${ACCOUNTS[@]}"; do mkdir -p "$ROOT/$a"; done
printf 'SITE=%q\nKEY=%q\n' "$SITE" "$KEY" > "$APP_DIR/config"
chmod 600 "$APP_DIR/config"
touch "$APP_DIR/seen.txt"

# ── The helper that runs in the background ──
cat > "$APP_DIR/sync.sh" <<'SYNC'
#!/bin/bash
APP_DIR="$HOME/Library/Application Support/PlannerSync"
ROOT="$HOME/Content"
. "$APP_DIR/config"
SEEN="$APP_DIR/seen.txt"
touch "$SEEN"
log() { echo "$(date '+%Y-%m-%d %H:%M') $*"; }

send() { # channel platform name type note
  local code
  code=$(curl -s -o "$APP_DIR/last-response.txt" -w "%{http_code}" --max-time 30 \
    -H "Authorization: Bearer $KEY" \
    --form-string "channel=$1" --form-string "platform=$2" --form-string "name=$3" \
    --form-string "type=$4" --form-string "note=$5" "$SITE/api/queue")
  if [ "$code" = "200" ]; then return 0; fi
  log "⚠️  Couldn't add \"$3\" ($code): $(cat "$APP_DIR/last-response.txt" 2>/dev/null | head -c 300)"
  return 1
}

recent() { # true if anything inside was changed in the last minute (still copying)
  [ -n "$(find "$1" -mmin -1 2>/dev/null | head -n 1)" ]
}

for acc in "$ROOT"/*/; do
  acc="${acc%/}"; folder="$(basename "$acc")"
  case "$folder" in *" - "*) ;; *) continue ;; esac
  channel="${folder% - *}"; platform="${folder##* - }"
  for item in "$acc"/*; do
    [ -e "$item" ] || continue
    base="$(basename "$item")"
    case "$base" in .*|*.txt|Icon*) continue ;; esac
    lower="$(echo "$base" | tr '[:upper:]' '[:lower:]')"
    note=""
    if [ -d "$item" ]; then
      n=$(find "$item" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.heic' -o -iname '*.webp' -o -iname '*.mp4' -o -iname '*.mov' \) | wc -l | tr -d ' ')
      [ "$n" -eq 0 ] && continue
      name="$base"; type="Carousel ($n items)"
      [ -f "$item/note.txt" ] && note="$(head -c 1000 "$item/note.txt")"
    else
      case "$lower" in
        *.mp4|*.mov|*.m4v|*.avi|*.mkv) type="Video" ;;
        *.jpg|*.jpeg|*.png|*.heic|*.webp) type="Image" ;;
        *) continue ;;
      esac
      name="${base%.*}"
      [ -f "$acc/$name.txt" ] && note="$(head -c 1000 "$acc/$name.txt")"
    fi
    key="$channel|$platform|$name"
    grep -Fxq "$key" "$SEEN" && continue
    recent "$item" && continue
    if send "$channel" "$platform" "$name" "$type" "$note"; then
      echo "$key" >> "$SEEN"
      log "✅ Added \"$name\" to $channel $platform"
    fi
  done
done
SYNC
chmod +x "$APP_DIR/sync.sh"

# ── Run it every 5 minutes, and right away when a folder changes ──
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
  echo '<plist version="1.0"><dict>'
  echo '  <key>Label</key><string>com.planner.contentsync</string>'
  echo "  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$APP_DIR/sync.sh</string></array>"
  echo '  <key>StartInterval</key><integer>300</integer>'
  echo '  <key>RunAtLoad</key><true/>'
  echo '  <key>WatchPaths</key><array>'
  for a in "${ACCOUNTS[@]}"; do echo "    <string>$ROOT/$a</string>"; done
  echo '  </array>'
  echo "  <key>StandardOutPath</key><string>$HOME/Library/Logs/planner-sync.log</string>"
  echo "  <key>StandardErrorPath</key><string>$HOME/Library/Logs/planner-sync.log</string>"
  echo '</dict></plist>'
} > "$PLIST"
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

# ── Quick check that the website accepts the key ──
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -H "Authorization: Bearer $KEY" --form-string "name=" "$SITE/api/queue" || true)
echo ""
if [ "$code" = "401" ]; then
  echo "❌ The website says the key is wrong. Run me again and paste the CRON_SECRET exactly as it is in Vercel."
  exit 1
elif [ "$code" = "400" ]; then
  echo "✅ All set! Connected to $SITE"
else
  echo "⚠️  Couldn't reach $SITE (code $code). Check your internet and that the website is up to date, then run me again."
fi
echo ""
echo "📁 Your account folders are in: $ROOT"
echo "   Drop a video, an image, or a folder of images (for a carousel post) into the right account folder."
echo "   Tip: add a note.txt inside a folder (or 'video name.txt' next to a video) saying what it's about. It makes the captions better."
echo "   New items show up on the website within a few minutes. Deleting files later is fine."
echo ""
open "$ROOT"
