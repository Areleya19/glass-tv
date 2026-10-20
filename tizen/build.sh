#!/bin/sh
# Assembles the Samsung (Tizen) package folder from the shared web app in webos/, then, when Samsung's
# Tizen CLI is on PATH, packages it: tizen/build/GlassTV.wgt. Usage: tizen/build.sh [security profile]
set -e
cd "$(dirname "$0")"
rm -rf build && mkdir -p build/app
for f in index.html app.js places.js style.css icon.png largeIcon.png; do cp ../webos/$f build/app/; done
cp -R ../webos/fonts build/app/
cp config.xml build/app/
echo "Package folder ready: tizen/build/app"
if command -v tizen >/dev/null 2>&1; then
  tizen package -t wgt ${1:+-s "$1"} -- build/app -o build
  ls build/*.wgt
else
  echo "Tizen CLI not found: install Tizen Studio with the TV extension to make the .wgt (see tizen/README.md)."
fi
