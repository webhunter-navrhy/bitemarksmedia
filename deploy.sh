#!/usr/bin/env bash
# Nasazení na GitHub Pages: webhunter-navrhy/<slug>, zdroje ve větvi main; web sestaví GitHub Actions (.github/workflows/deploy.yml),
# takže stejnou cestou jde i uložení z administrace (commit přes webhunter-admin). Lokální build slouží jen ke kontrole.
#   ./deploy.sh              # build, commit, push, počkat na Pages, ověřit HTTP 200, spustit QA
#   ./deploy.sh --dry        # jen build + výpis, co by se stalo (nic se nepushne)
#   ./deploy.sh --bez-qa     # bez závěrečného qa.py
# Token: ~/.webhunter-gh-token (neukládá se do remote). Repo musí existovat (novy_web.py <slug> --repo).
set -euo pipefail
cd "$(dirname "$0")"
DRY=0; QA=1
for a in "$@"; do case "$a" in --dry) DRY=1;; --bez-qa) QA=0;; esac; done

PY="${PY:-/Library/Frameworks/Python.framework/Versions/3.14/bin/python3}"
export SSL_CERT_FILE="$($PY -c 'import certifi;print(certifi.where())')"
SLUG="$($PY -c 'import json;print(json.load(open("_data/site.json"))["slug"])')"
ORG="webhunter-navrhy"
REPO="$ORG/$SLUG"
URL="https://$ORG.github.io/$SLUG/"
TOKEN="$(cat ~/.webhunter-gh-token)"
export GH_TOKEN="$TOKEN"
REMOTE="https://github.com/$REPO.git"
PUSH_URL="https://x-access-token:${TOKEN}@github.com/$REPO.git"

[ "$SLUG" = "SLUG" ] && { echo "CHYBA: site.json má slug SLUG, nastav ho (novy_web.py to dělá)"; exit 2; }
echo "== build"; "$PY" build.py

if [ "$DRY" = 1 ]; then
  echo "DRY: pushnul bych zdroje do $REPO (main), počkal na build v Actions a ověřil $URL, pak QA."
  exit 0
fi

echo "== main (zdroje)"
[ -d .git ] || git init -q -b main
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$REMOTE" || git remote add origin "$REMOTE"
git add -A
git -c user.name="WebHunter" -c user.email="info@webhunter.cz" commit -q -m "Aktualizace webu $(date +%F\ %H:%M)" || echo "(nic nového k commitu)"
# klientka mohla mezitím uložit změny z administrace -> nejdřív je stáhnout (nikdy nepřepsat)
if git fetch -q "$PUSH_URL" main 2>/dev/null; then
  git -c user.name="WebHunter" -c user.email="info@webhunter.cz" rebase -q FETCH_HEAD || { git rebase --abort; echo "CHYBA: konflikt se změnami z administrace – vyřeš ručně (git pull)"; exit 5; }
fi
git push -q "$PUSH_URL" HEAD:main

echo "== Pages z GitHub Actions (build_type=workflow)"
BT="$(gh api "repos/$REPO/pages" --jq .build_type 2>/dev/null || echo none)"
if [ "$BT" = "none" ]; then gh api "repos/$REPO/pages" -X POST -f build_type=workflow >/dev/null; echo "  Pages zapnuty"
elif [ "$BT" != "workflow" ]; then gh api "repos/$REPO/pages" -X PUT -f build_type=workflow >/dev/null; echo "  přepnuto z $BT na workflow"; fi

echo "== čekám, až web nasadí commit $(git rev-parse --short HEAD) (Actions build)"
SHA="$(git rev-parse HEAD)"
OK=0
for i in $(seq 1 60); do
  V="$(curl -s "${URL}version.json?t=$(date +%s)" | "$PY" -c 'import json,sys;print(json.load(sys.stdin).get("sha",""))' 2>/dev/null || true)"
  if [ "$V" = "$SHA" ]; then OK=1; echo "  nasazeno"; break; fi
  R="$(gh run list -R "$REPO" -L 1 --json status,conclusion --jq '.[0].status+"/"+.[0].conclusion' 2>/dev/null || echo ?)"
  echo "  [$i] run: $R"
  case "$R" in completed/failure|completed/cancelled) echo "CHYBA: build v Actions selhal (gh run view -R $REPO --log-failed)"; exit 3;; esac
  sleep 10
done
[ "$OK" = 1 ] || { echo "CHYBA: nasazení nedoběhlo v limitu"; exit 3; }

echo "== HTTP 200 na $URL"
"$PY" - "$URL" <<'PYEOF'
import ssl, sys, time, urllib.request, certifi
u = sys.argv[1]; ctx = ssl.create_default_context(cafile=certifi.where())
for i in range(30):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), context=ctx, timeout=20)
        if r.status == 200:
            print("  200 OK"); sys.exit(0)
    except Exception as e:
        print("  čekám:", e)
    time.sleep(6)
print("CHYBA: web nevrací 200"); sys.exit(4)
PYEOF

if [ "$QA" = 1 ]; then
  echo "== QA"
  "$PY" ~/wh-navrhy-ops/tools/qa.py "$URL" "$PWD/qa" || { echo "QA našlo chyby (viz qa/qa.json)"; exit 1; }
fi
echo "HOTOVO: $URL"
