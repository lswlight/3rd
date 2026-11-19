#!/bin/bash
# 검토용 APK: 출시판을 만든 뒤 TEST_UNLOCK 을 켠 채(모두 열린 상태) com.graftkorea.geumeum.test 로 디버그 빌드
# 사용: tools/build_apk.sh 이름     (결과: $APK_DIR/out/이름.apk)
# 필요: Node, JDK 21, Android SDK(platforms;android-36, build-tools) — ANDROID_HOME 으로 위치 지정
set -e
G=$(cd "$(dirname "$0")/.." && pwd); A=${APK_DIR:-$HOME/geumeum-apk}; export ANDROID_HOME=${ANDROID_HOME:-/opt/android-sdk}
if [ ! -d "$A/android" ]; then # 처음 한 번: Capacitor 프로젝트 만들기
  mkdir -p "$A/www" && cd "$A" && npm init -y >/dev/null && npm install @capacitor/core@8 @capacitor/cli@8 @capacitor/android@8 cordova-plugin-purchase
  printf '{\n  "appId": "com.graftkorea.geumeum.test",\n  "appName": "그믐 검토판",\n  "webDir": "www",\n  "android": { "backgroundColor": "#05060c" }\n}\n' > capacitor.config.json
  echo '<html></html>' > www/index.html && npx cap add android
  sed 's/^package com.graftkorea.geumeum;/package com.graftkorea.geumeum.test;/' "$G/release/android_patch/MainActivity.java" > android/app/src/main/java/com/graftkorea/geumeum/test/MainActivity.java
  sed -i 's/<activity/<activity android:screenOrientation="sensorLandscape"/' android/app/src/main/AndroidManifest.xml
  echo "sdk.dir=$ANDROID_HOME" > android/local.properties
  python3 - "$G/store/out/icon_A_512x512.png" <<'PY'
import sys, shutil
from PIL import Image
src = Image.open(sys.argv[1]).convert('RGBA')
for d, n in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    for f in ('ic_launcher.png', 'ic_launcher_round.png'): src.resize((n, n), Image.LANCZOS).save(f'android/app/src/main/res/mipmap-{d}/{f}')
shutil.rmtree('android/app/src/main/res/mipmap-anydpi-v26', ignore_errors=True)
PY
fi
cd "$G" && python3 build_release.py
rm -rf "$A/www" && cp -r "$G/release/www" "$A/www"
sed -i 's/const TEST_UNLOCK = false;/const TEST_UNLOCK = true;/' "$A/www/index.html"
cd "$A" && npx cap sync android >/dev/null && cd android && ./gradlew -q assembleDebug
mkdir -p "$A/out" && cp app/build/outputs/apk/debug/app-debug.apk "$A/out/${1:-review}.apk" && ls -la "$A/out/${1:-review}.apk"
