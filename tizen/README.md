# Glass TV for Samsung TVs (Tizen) (preview)

Samsung TVs run Tizen, not Android. Glass TV's webOS app ([../webos](../webos/README.md)) runs on Tizen too:
the same web app, in Samsung's packaging. This folder holds that packaging: `config.xml` and `build.sh`.

**It is a preview.** It has been checked in Chrome in its Samsung mode (`index.html#platform=tizen`), with the
stress test passing there, but not on a real Samsung TV, and not in Samsung's TV Simulator yet (see below).

## What it can and cannot do on a Samsung TV

| | On Tizen |
|---|---|
| Glass look, places with names, clock, gliding selection, moving apps (hold OK, Move) | Yes |
| Listing and opening the TV's apps | Yes, through `tizen.application` (to be confirmed on a real TV) |
| The Inputs and Settings buttons | **Left out.** Samsung keeps switching inputs to its partner apps |
| Being the **home screen** | **No.** Tizen lets no app replace its home screen: Glass TV is an app you open |
| Debloating, cache cleaning, the clock screensaver | **No.** Tizen gives apps no access to the system |

For the whole Glass TV on a Samsung TV, plug in a Google TV or Android TV box (Chromecast with Google TV, Mi Box,
NVIDIA Shield) and set it up as in the main [README](../README.md).

## Building and installing

Install [Tizen Studio](https://developer.samsung.com/smarttv/develop/tools/tizen-studio.html) with the
Samsung TV extension, and make a Samsung certificate in its Certificate Manager (needs a free Samsung
account). Then:

```bash
tizen/build.sh <certificate profile name>      # makes tizen/build/GlassTV.wgt
```

On the TV: open Apps, type 1 2 3 4 5 on the remote, switch **Developer mode** on and enter this computer's
IP address, restart the TV. Then:

```bash
sdb connect <tv ip>
tizen install -n tizen/build/GlassTV.wgt -t <tv name from: sdb devices>
tizen run -p GlassTV001.GlassTV -t <tv name>
```

## Simulators

- **Samsung TV Emulator**: Intel Macs, Windows and Linux only; it does not run on Apple-silicon Macs.
- **Samsung TV Simulator** (in the TV extension): needs Rosetta on Apple-silicon Macs
  (`softwareupdate --install-rosetta`).
- **Chrome**: `webos/index.html#platform=tizen` shows the Samsung mode; `#platform=tizen-stress` stress-tests it.
