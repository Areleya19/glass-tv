# Instructions for AI agents

You are helping someone set up **Clean TV** on their own TV: debloat it, install this launcher as the home
screen, with pictures of places behind it. This file is the playbook. It is written for any brand and for any
AI model, large or small. Follow it in order, and read [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
before you improvise a fix.

## Will it work on this TV?

Ask the person for the TV's brand and model, and what the Settings → About screen says. Then use this table.
It is the operating system that matters, not the brand: Hisense, Panasonic, Toshiba, TCL and Philips sell both
kinds.

| The TV or box runs | Debloat | Clean TV home screen |
|---|---|---|
| **Android TV or Google TV, Android 8 or newer** (Sony, TCL, Xiaomi, Philips, many Hisense, Sharp, OnePlus, NVIDIA Shield, Chromecast with Google TV, Mi Box, Android projectors…) | yes | yes |
| Android TV 5, 6 or 7 | yes | no: the launcher needs Android 8 |
| Fire TV (Amazon sticks, Fire TV Edition TVs) | yes | no: Fire OS takes Home back from any other launcher |
| Samsung (Tizen), LG (webOS), Roku, VIDAA, Vizio SmartCast, Panasonic My Home Screen, Apple TV | no | no: these can't run Android apps |

If the answer is **no**, say so plainly and stop. Don't look for workarounds. After connecting (step 1), confirm
it: `ro.build.version.sdk` must be **26 or higher** for the launcher.

The launcher adapts by itself to everything else: 720p, 1080p and 4K screens, TVs with or without HDMI inputs
or a tuner (sticks and boxes just show fewer inputs), any language. On a weak TV (1 GB of RAM, or the selection
stutters) set `"reduced_motion": true` in the theme (step 6).

## How to follow this playbook

Written so that any model can follow it to the letter:

- Do the steps in order, one at a time. Don't skip ahead or merge steps.
- Run **one command per shell call** and read its output before the next one.
- Every step ends with a **Check**. If the check fails, stop. Look the message up in
  [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md); if it isn't there, tell the person exactly what you saw.
  Never invent a fix that disables, uninstalls, resets or restarts something.
- Replace every `<ip>`, `<pkg>`, `<folder>` with a real value. Never run a line that still contains `<` `>`.
- Ask the person questions they can answer with yes/no or by reading the TV screen. Never ask them to type
  commands.
- Write every command that changes the TV into `backup/log.txt`, so all of it can be undone.
- Commands here are for macOS and Linux. On Windows use the `.ps1` script of the same name (`tools\disable.ps1`,
  `tools\theme.ps1`, `launcher\build-and-install.ps1`); see [docs/CLEANYOURTV-README.md](docs/CLEANYOURTV-README.md).
- When unsure, the answer is always: leave it as it is and ask.

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
- Set up the Python client once (all the scripts use it; no `adb` program is needed):
  `python3 -m venv tools/venv && tools/venv/bin/pip install -r tools/requirements.txt`
- Connect: `TV_HOST=<ip> tools/venv/bin/python -I tools/tv.py --probe`. When the "Allow USB debugging?"
  prompt appears on the TV, tell the person to tick **Always allow** and press OK, then run it again.
- **Check**: it prints six lines, `ro.product.model = …` through `ro.product.manufacturer = …`. A timeout or
  "connection refused" means debugging is off or the IP is wrong: see TROUBLESHOOTING, "Connecting".
  Note `ro.build.version.sdk`: below 26, stop after step 3 (debloat only).
- To run any shell command on the TV: `TV_HOST=<ip> tools/venv/bin/python -I tools/tv.py '<command>'`.
  Using `adb` instead is fine where it works (`adb connect <ip>:5555`, then `adb shell '<command>'`).

### 2. Identify the TV and back up

- `tools/tv.py --probe` gives model, codename and Android version. Look for a matching folder in
  [examples/](examples/): its `debloat.txt` is a tested list, and its header names packages that must stay.
- Do the backup from rule 3. Also note `cmd package query-activities --brief -a android.intent.action.MAIN
  -c android.intent.category.HOME`: every app that can claim Home.
- **Check**: the backup files exist in `backup/` and none is empty.

### 3. Debloat

- With a matching example: copy its `debloat.txt`, show the person what it disables, comment out anything
  they use, then apply it in batches with `tools/disable.sh <list>`.
- Without one: list packages, sort them into telemetry, ads and content rows, background services, preloaded
  apps and streaming apps, and propose a list. Only the first three are candidates without asking.
- Run `pm` commands one per shell call; chained commands can silently stop after the first.
- Keep the stock launcher's packages until step 5.
- **Check** after every batch: the person presses Home and the TV's own home screen still opens, the remote
  works, Wi-Fi is connected, and an HDMI input still shows a picture. If anything broke, re-enable that batch's
  packages one by one (`pm enable <pkg>`) before going on.

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
- **Check**: `launcher/app/build/outputs/apk/release/app-release.apk` exists and is about 300 KB.

### 5. Install and make it Home

- `TV_HOST=<ip> launcher/build-and-install.sh`. It installs, starts the launcher, disables the stock launcher
  only after the new one is running, sets the home activity, and puts the stock one back if Home lands
  elsewhere.
- Before that, look at the Home list from step 2. Disable any other app there that is neither the stock
  launcher nor this one, after asking (on Xiaomi the factory test app `com.duokan.factorytest`), or the Home
  button can land on it.
- On Google TV the setup wizard (`com.google.android.tungsten.setupwraith`) can take Home; see the
  troubleshooting guide.
- After the stock launcher is gone, its recommendation services (`tvrecommendations`, `leanbacklauncher*`)
  can be disabled too.
- **Check**: the script prints `Home now resolves to com.gathin.tvhome/…` and ends with `Installed. Press Home
  on the remote to see it.` A line starting with `ERROR:` means it stopped and already put the stock launcher
  back; the message says what to do next.

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
- **Places**: on by default, nothing to set up. The first week's pictures arrive within a minute of Home first
  starting with internet; until then the background is plain. `"places": false` uses the theme's own pictures
  and keeps the launcher offline.
- **App order**: the person can arrange the apps themselves on the TV (hold OK on an app → Move); once they
  have, their order wins over `dock_apps`.
- **Android 10 quirk**: the first time the launcher gains the internet permission, sockets fail with `EPERM`
  until the TV restarts. Ask before restarting it.
- Point the screensaver at the launcher's clock before disabling the stock screensaver:
  `settings put secure screensaver_components com.gathin.tvhome/.ClockDream`.
- **Check**: Home restarts within a few seconds with the new settings.

### 7. Verify and hand over

- Ask before taking screenshots. Use `screencap -p /sdcard/s.png` and pull it; `exec-out screencap` gives
  broken PNGs on some MediaTek TVs. Screenshots of Live TV, HDMI or Netflix come out black.
- Check: Home is the new launcher (`cmd package resolve-activity --brief -c android.intent.category.HOME -a
  android.intent.action.MAIN`), System UI and the TV service are running, the dock and grid show the apps.
- Ask the person to try with the real remote: Home button, Inputs → an HDMI device, playing a video, the mic
  button, screen mirroring, and holding OK on an app to move it.
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
