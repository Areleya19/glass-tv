# Instructions for AI agents

You are helping someone set up **Clean TV** on their own Android TV or Google TV: debloat it, install this
launcher as the home screen, with pictures of places behind it. This file is the playbook. It works for
any brand (Xiaomi, TCL, Sony, Hisense, Philips, OnePlus, NVIDIA Shield, Chromecast, projectors…). Follow it in
order, and read [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) before you improvise a fix.

It does **not** work on Samsung (Tizen), LG (webOS) or other non-Android TVs. On Fire TV only the debloat half
works, because Fire OS will not hand Home to another launcher.

## Ground rules

1. **The TV belongs to a family that is using it.** Ask before every change to the TV, say what it does and
   how to undo it, and wait for a yes. Ask even before read-only actions like screenshots or key presses if the
   person may be watching. If they say stop, stop touching the TV completely.
2. **Never uninstall a system package.** Disable it for user 0 (`pm disable-user --user 0 <pkg>`) so it can be
   restored. Keep a list of everything you disable and give the person a restore script.
3. **Back up before changing anything**: full package list, disabled list, `getprop`, `settings list system`,
   `secure` and `global`, and which app owns Home. Keep it outside the repository (`backup/` is gitignored).
4. **Disable in small batches** (about 10) and check the TV after each batch: Home still works, and the
   person confirms HDMI, the remote and Wi-Fi still work.
5. **Never disable what the TV needs**: the TV/tuner and HDMI input services, the input or source menu, the
   remote and Bluetooth pairing, the on-screen keyboard, Settings, System UI, Google Play Store and Play
   Services, and the current launcher until the new one is installed. Manufacturer package names often don't
   say what they do: check `dumpsys package <pkg>` for its activities and services before you touch one.
6. **Ask before touching anything the person might use**: streaming apps, voice search, Chromecast, screen
   mirroring (Miracast), casting, the USB media player, firmware updates. Use a checklist question.
7. **Don't guess what an app is from its name.** Example: on Xiaomi, `com.xiaomi.mitv.smartshare` looks like
   bloat but is the Miracast screen. When unsure, leave it on and ask.
8. **Credentials stay with the person.** They type passwords, PINs and pairing codes themselves. Never write an
   API key or token into the repository.
9. **Family-friendly by default.** The places pictures skip any picture with people in it; keep it that way.
   Ask about the person's preferences for any images you show them or put in docs.
10. **Downloads need a yes.** Say the file name, source and size before downloading tools (Android platform
    tools, JDK 17, Android SDK, GitHub CLI).

## Step by step

### 1. Connect

- On the TV: Settings → Device Preferences → About → press OK on **Build** seven times, then Developer
  options → **USB debugging** on (also "Network/ADB debugging" if shown). No cable is needed; it works over the
  home Wi-Fi. Some TVs show **Wireless debugging** with a pairing code instead; ask the person for the code
  and the `ip:port`, then `adb pair`.
- Ask for the TV's IP address (Settings → Network & Internet → the Wi-Fi network).
- Connect: `adb connect <ip>:5555`. When the "Allow USB debugging?" prompt appears on the TV, tell the person
  to tick **Always allow** and press OK.
- If macOS says "No route to host" while the port is open, use the Python client instead:
  `python3 -m venv tools/venv && tools/venv/bin/pip install -r tools/requirements.txt`, then
  `TV_HOST=<ip> tools/venv/bin/python -I tools/tv.py --probe`.

### 2. Identify the TV and back up

- `tools/tv.py --probe` gives model, codename and Android version. Look for a matching folder in
  [examples/](examples/): its `debloat.txt` is a tested list, and its header names packages that must stay.
- Do the backup from rule 3. Also note `cmd package query-activities --brief -a android.intent.action.MAIN
  -c android.intent.category.HOME`: every app that can claim Home.

### 3. Debloat

- With a matching example: copy its `debloat.txt`, show the person what it disables, comment out anything
  they use, then apply it in batches with `tools/disable.sh <list>`.
- Without one: list packages, sort them into telemetry, ads and content rows, background services, preloaded
  apps and streaming apps, and propose a list. Only the first three are candidates without asking.
- Run `pm` commands one per shell call; chained commands can silently stop after the first.
- Keep the stock launcher's packages until step 5.

### 4. Build the launcher

- Needs JDK 17 and Android SDK platform 34 + build-tools 34.0.0. On a Mac without Homebrew, download
  Temurin 17 and the Android command-line tools, then `sdkmanager --sdk_root=<dir> --licenses` (the person
  must agree to the licence) and `"platforms;android-34" "build-tools;34.0.0"`.
- **Paths with spaces** (e.g. macOS "Application Support") break `sdkmanager`. Keep the JDK and SDK in a
  path without spaces.
- Configure in `launcher/app/src/main/res/values/config.xml`, or better with a theme (step 6): ask which four
  apps go in the dock and in what order, using the package names from `pm list packages -3`.
- Build: `cd launcher && ./gradlew testReleaseUnitTest assembleRelease`. The APK must stay under 400 KB
  (CI checks it).

### 5. Install and make it Home

- `TV_HOST=<ip> launcher/build-and-install.sh`. It installs, starts the launcher, disables the stock launcher
  only after the new one is running, sets the home activity, and puts the stock one back if Home lands
  elsewhere.
- Before that, disable any other app that claims Home at the same priority as a third-party launcher (on
  Xiaomi, the factory test app `com.duokan.factorytest`), or the Home button can land on it.
- On Google TV the setup wizard (`com.google.android.tungsten.setupwraith`) can take Home; see the
  troubleshooting guide.
- After the stock launcher is gone, its recommendation services (`tvrecommendations`, `leanbacklauncher*`)
  can be disabled too.

### 6. Settings and wallpapers (themes)

A theme is a folder with `config.json` (and optional `wallpaper.jpg` or `wallpapers/`). Push it with
`TV_HOST=<ip> tools/theme.sh <folder>`, no rebuild needed. All keys are in
[themes/README.md](themes/README.md). Useful ones:

```json
{
  "dock_apps": ["com.google.android.youtube.tv", "com.netflix.ninja"],
  "show_network_pill": false,
  "wallpaper_seconds": 15
}
```

- `dock_apps` beyond the dock's size continue as the first grid rows, in order, so the person can order the
  grid too.
- **Places**: on by default, nothing to set up; `"places": false` uses the theme's own pictures and keeps the
  launcher offline.
- **Android 10 quirk**: the first time the launcher gains the internet permission, sockets fail with `EPERM`
  until the TV restarts. Ask before restarting it.
- Point the screensaver at the launcher's clock before disabling the stock screensaver:
  `settings put secure screensaver_components com.gathin.tvhome/.ClockDream`.

### 7. Verify and hand over

- Ask before taking screenshots. Use `screencap -p /sdcard/s.png` and pull it; `exec-out screencap` gives
  broken PNGs on some MediaTek TVs. Screenshots of Live TV, HDMI or Netflix come out black.
- Check: Home is the new launcher (`cmd package resolve-activity --brief -c android.intent.category.HOME -a
  android.intent.action.MAIN`), System UI and the TV service are running, the dock and grid show the apps.
- Ask the person to try with the real remote: Home button, Inputs → an HDMI device, playing a video, the mic
  button, screen mirroring.
- Give them: the restore script (re-enables everything and puts the stock launcher back), where the theme
  folder is, and a reminder to switch USB debugging off when done.
- Offer to switch off firmware updates only after explaining the trade-off: updates can bring the bloat back,
  but they also carry security fixes.

## Working on this repository

- Tests: `python3 -m unittest discover -s tests` (CI sets `CLEANYOURTV_STRICT=1` on every push, which also checks the guide's counts) and
  `cd launcher && ./gradlew testReleaseUnitTest assembleRelease`.
- The original Clean Your TV guide lives in [docs/CLEANYOURTV-README.md](docs/CLEANYOURTV-README.md); the tests
  read its TV table and counts. Keep its relative links pointing one level up (`../`).
- Keep the launcher light: no new background services, no network use but the weekly places pictures (none with
  `"places": false`), one wallpaper bitmap
  in memory, decoding off the main thread, nothing running while another app is in front.
- Commits carry only the human author's identity. Don't add AI attribution lines.
- Credit stays: this project is based on [Clean Your TV](https://github.com/Gathin23/cleanyourtv) by Gathin (MIT).
  Keep `LICENSE`, `launcher/FONT-LICENSE-OFL.txt` and the note in the README on where the places pictures
  come from.
- [PROMPT.md](PROMPT.md) is the original one-paste prompt; this file adds the safety rules and the lessons above.
