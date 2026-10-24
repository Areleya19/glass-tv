# Roadmap

Ideas and work that is planned but not built yet. Nothing here is a promise or a date; each item says what
it would take and what stands in the way.

## In progress

### Keep Home when the TV takes it back

Some TVs give Home back to their own launcher after a firmware update, an update of the stock launcher, or a
reboot, and people then see the TV's own home screen again. Glass TV would notice and take Home back by
itself, the way the install script does: disable the stock launcher (never uninstall it), set Glass TV as
Home, and enable the stock launcher again at once if Home doesn't land on Glass TV.

It acts only for people who chose Glass TV: on a TV where Glass TV has been Home before, when Home has moved
to one of the known stock launchers. It leaves alone a TV where Glass TV was never Home, another launcher
someone picked, a TV given back on purpose (`tools/restore.sh`), Fire TV, and `"keep_home": false`. It never
disables the setup wizard, which on some Sony sets holds the saved Wi-Fi. It needs the same debugging
permission as the cache cleaning. Status: written and built, not yet tested on a TV or merged.

## Planned

### Samsung (Tizen): an app that comes back after Samsung's home

Samsung lets no app replace its home screen or Home button, so the earlier Tizen preview was dropped (see
[DEVICES.md](DEVICES.md)). A Samsung owner on Threads pointed to
[samsung-tv-launcher](https://github.com/dylanfernandezdelara/samsung-tv-launcher) (MIT), which gets close
with one trick:

- It is a normal Samsung web app with `background-support` on, so it keeps running after you leave it.
- Every 50 to 500 ms it asks the TV which app is in front (`webapis.appcommon.getForegroundAppId()`). When
  that is Samsung's home (`com.samsung.tv.csfs`), it opens itself again.
- For 10 seconds after the TV is switched on, it replaces the last input or "no signal" screen with itself.
- Back twice quickly opens Samsung's home and leaves it alone for 2 minutes.

Glass TV's Samsung version would be the webOS app in Samsung's packaging plus this trick. What it would still
not do, and must say plainly:

- **It is not the home screen.** Leaving an app shows Samsung's home for about half a second first, and
  switching the TV on shows the last input for about a second. Home still opens Samsung's menu.
- **No debloat, no cache cleaning, no clock screensaver.** Tizen gives apps no access to the system.
- **Setup is heavier:** Developer Mode (Apps, then 1 2 3 4 5), a full unplug to start it, Samsung's Tizen
  tools and a Samsung certificate signed for that TV.
- Samsung's local remote-control port (8001) has no login, so anything on the Wi-Fi can open apps on the
  TV. That is Samsung's design; the setup should mention it.

To do: rebuild the Tizen packaging (it is in git history before `68f87c8`), add the return-to-itself loop with
its own off switch, test on a real Samsung TV (the Samsung TV emulator does not run on Apple-silicon Macs),
and credit samsung-tv-launcher for the idea. Until then, Samsung owners are pointed to a Google TV stick.
