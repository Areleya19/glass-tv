# Clean TV

**A calm home screen for Android TV and Google TV, with places to visit behind it.**

Based on [Clean Your TV](https://github.com/Gathin23/cleanyourtv) by Gathin. Not affiliated with it.
Clean TV keeps everything Clean Your TV does — debloat any Android TV over Wi-Fi, no root, fully reversible,
and swap the ad-filled home screen for a light Apple TV-style launcher — and adds a home screen that shows a
new set of places every week.

![Home screen](docs/screenshots/home-movie.jpg)

## What Clean TV adds

- **Places to visit that renew themselves.** Once a week the TV takes the pictures Bing has shown on its home
  page over the past days — landmarks, landscapes, wildlife — deletes last week's and rotates through them,
  dimmed so the clock and tiles stay readable. The shelf above the dock names each one, its country and a few
  lines about it. Pictures with people in them are skipped: by the words in their caption, and by Android's
  own face detector on the TV. No key, no account, nothing to set up.
- **Rotating wallpapers of your own** instead, with `"places": false`: put pictures in a theme's `wallpapers/`
  folder and choose how often they change, down to every 5 seconds. Each picture is decoded in the background
  and cross-faded.
- **Glass everywhere.** The dock band and the Inputs panel are frosted glass, like the top-bar buttons.
- **Rows feather out under the top bar** instead of being cut off when you scroll.
- **A calmer highlight.** The glass highlight glides onto a tile and stops, with no bounce, hugs the tile's
  corners exactly, and the focus zoom is a gentler 7 %.
- **Smooth colour.** The glow behind the dock blends straight from one app's colour to the next.
- **A tidier top bar.** Hide the Wi-Fi / Ethernet button (`show_network_pill`); the Inputs menu has outline
  HDMI icons and better-sized AV and Live TV icons.

| | |
|---|---|
| ![The app grid scrolled up, rows feathering out under the top bar](docs/screenshots/grid.jpg) | ![The Inputs menu with outline HDMI icons](docs/screenshots/inputs.jpg) |
| *The grid, feathering out under the top bar* | *Inputs: HDMI 1–3, AV and Live TV* |
| ![Home screen with a night-sky wallpaper of your own](docs/screenshots/home-night-sky.jpg) | |
| *Your own wallpaper, with the network button hidden* | |

Still light: on a Xiaomi Mi TV with 1.8 GB of RAM the launcher uses about 65–80 MB, one wallpaper is in memory
at a time, the movie pictures take under 2 MB of storage, and nothing runs while you are inside an app.

## Setting it up

**Using an AI coding agent** (Claude Code, Codex, Cursor, Copilot…)? Point it at this repository and ask it to
set up your TV. [AGENTS.md](AGENTS.md) tells any agent how to do it safely on any Android TV or Google TV:
asking before each change, backing up first, never uninstalling, and checking with you as it goes.

Debloating and installing work exactly as in CleanYourTV; its full guide is in
[docs/CLEANYOURTV-README.md](docs/CLEANYOURTV-README.md), and [PROMPT.md](PROMPT.md) lets a coding assistant do
it for you. In short:

```bash
python3 -m venv tools/venv && tools/venv/bin/pip install -r tools/requirements.txt
export TV_HOST=192.168.1.50                                   # your TV's IP address
tools/disable.sh examples/<your tv>/debloat.txt               # debloat
launcher/build-and-install.sh                                 # build the launcher and make it Home
tools/theme.sh themes/<your theme>                            # push your settings and wallpapers
```

To stop the TV's storage filling with Play Store leftovers — which can corrupt
an app's cache badly enough to leave it launching to a blank screen —
[`tools/cache-clean.sh`](docs/cache-clean.md) finds the TVs on your network and
clears their caches, leaving sign-ins and app data untouched.

## Places, or pictures of your own

Places are on from the start. To change how often the picture changes, or to use your own pictures and keep
the launcher offline, make a theme folder with a `config.json` like this and push it with `tools/theme.sh`:

```json
{
  "places": false,
  "wallpaper_seconds": 15,
  "show_network_pill": false
}
```

All keys are listed in [themes/README.md](themes/README.md). With `"places": false`, the launcher never goes
online.

## Credits and licence

- Built on [CleanYourTV](https://github.com/Gathin23/cleanyourtv) © 2026 Gathin, MIT licence — see
  [LICENSE](LICENSE). Its debloat lists, tools and launcher are the foundation of this project.
- The Outfit typeface is under the SIL Open Font License (`launcher/FONT-LICENSE-OFL.txt`).
- The Inputs icon is from Google's Material Icons (Apache 2.0).
- Pictures of places and their captions are Bing's daily images (Microsoft). They are fetched on your own TV
  and are not part of this repository.
