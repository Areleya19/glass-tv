# Keeping the cache down

Android TVs quietly accumulate cache, and the Play Store is the worst offender:
on a 43" Mi TV with 11 GB of storage it had hoarded roughly 6.6 GB of leftover
download fragments, filling `/data` to 87%.

That is enough to break things in ways that do not look like a disk problem.
YouTube launched, reached its main activity, played its UI sounds — and drew
nothing at all. Clearing the caches freed about 7 GB and fixed it on the spot,
with no reinstall and no sign-out.

[`tools/cache-clean.sh`](../tools/cache-clean.sh) stops that from building up
again.

## What it does

1. Scans the local network for devices with ADB listening on port 5555.
2. Confirms each one is a television — `ro.build.characteristics` contains `tv`,
   or the device reports the leanback feature. A phone or tablet with ADB left
   on is reported and skipped, never touched.
3. Runs `pm trim-caches` on each confirmed TV, logging usage before and after.

Confirmed TVs are remembered under `~/.cache/clean-tv/`, so later runs find
them without a full scan. Nothing is written inside the repository.

## What it never touches

`pm trim-caches` can only reach cache directories. App data lives elsewhere, so
this cannot affect sign-ins, accounts, app settings, watch history or installed
apps. Cache is disposable by design — the TV re-downloads what it still needs.

## Usage

```sh
tools/cache-clean.sh                     # clean every TV found
tools/cache-clean.sh --dry-run           # report, change nothing
tools/cache-clean.sh --scan-only         # just list what is out there
tools/cache-clean.sh --device 10.0.0.5   # target one device
tools/cache-clean.sh --subnet 192.168.1  # scan a specific /24
```

A full sweep of a /24 takes about ten seconds. `adb` is found via `$ADB`, then
`PATH`, then `./platform-tools/adb`.

## Running it on a schedule (macOS)

Save this as `~/Library/LaunchAgents/com.example.tv-cache-clean.plist`, with
`REPO` replaced by the path to your checkout. `StartInterval` is in seconds —
172800 is every 48 hours.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>com.example.tv-cache-clean</string>
	<key>ProgramArguments</key>
	<array>
		<string>REPO/tools/cache-clean.sh</string>
	</array>
	<key>StartInterval</key>
	<integer>172800</integer>
	<key>RunAtLoad</key>
	<false/>
</dict>
</plist>
```

Then:

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.example.tv-cache-clean.plist
```

It only runs while the computer is awake and on the same network as the TV.
When the TV is off, the run logs that nothing was found and exits. To stop it:

```sh
launchctl bootout gui/$(id -u)/com.example.tv-cache-clean
```

## Compatibility

Android TV, Google TV, Fire TV and other Android-based sets. Samsung (Tizen)
and LG (webOS) have no equivalent interface and cannot be cleared this way.

## Notes from the field

**A blank app is not always a broken app.** When YouTube drew nothing, the
things that looked guilty were innocent: the clock was correct, DNS resolved,
the Play Store rendered normally, and the system volume overlay drew fine on
top of the blank app. A full disk and a corrupt cache were the whole story.

**`dumpsys media_session` settles arguments.** It reports playback state and
the current title, which tells you whether an app is genuinely playing when the
screen suggests otherwise.

**Screenshots can lie.** On some devices `adb exec-out screencap -p` prepends
vendor noise before the PNG header — strip everything before the first
`\x89PNG` or the file will not open. Video surfaces also capture as flat grey,
which looks exactly like a broken app and is not.

**Useful one-liners.**

```sh
adb connect <tv-ip>:5555
adb -s <tv-ip>:5555 shell df -h /data                 # free space
adb -s <tv-ip>:5555 shell dumpsys media_session       # is it really playing?
adb -s <tv-ip>:5555 shell pm trim-caches 9999999999   # clear caches
```
