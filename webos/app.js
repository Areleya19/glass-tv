/*
 * Glass TV for webOS. The Android launcher's Home, rebuilt as a webOS web app: the clock row, the place
 * shelf over a dimmed picture of a place, a glass dock of apps, and one selection that glides between
 * them. webOS lets no app replace its home screen, so this is an app you open; it lists and opens the
 * TV's apps through webOS's own application manager, and shows sample tiles where that is missing
 * (the webOS TV Simulator).
 */
(function () {
  'use strict';
  var COLUMNS = 4, TILE_W = 360, TILE_H = 202, GAP = 64, LEFT = 144;
  var DOCK_TILE_TOP = 720, GRID_TOP = 1036, ROW_PITCH = 292;
  /** How far the rows move up when a grid row is selected: the dock rises to 388, as on Android. */
  var GRID_SHIFT = -304;
  /** The pane is exactly the zoomed tile, behind it: hidden at rest, seen only while it glides. */
  var FOCUS_SCALE = 1.07;
  var ROTATE_MS = 60 * 1000;
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461 };

  var $ = function (id) { return document.getElementById(id); };
  var rowsEl = $('rows'), glider = $('glider'), hero = $('hero'), glow = $('glow');
  var pills = [$('inputs'), $('settings')];
  var apps = [], tiles = [], inputs = [];
  /** The Inputs menu: open or not, and which row is selected. */
  var menu = { open: false, index: 0, rows: [] };
  var HDMI_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><path d="M3,7.5H21V12.5L18.5,16.5H5.5L3,12.5Z"/><path d="M7,11H17"/></svg>';
  var AV_ICON = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M5,2c0,-0.55 -0.45,-1 -1,-1S3,1.45 3,2v4H1v6c0,1.3 0.84,2.4 2,2.82V23h2v-8.18C6.16,14.4 7,13.3 7,12V6H5V2zM13,2c0,-0.55 -0.45,-1 -1,-1s-1,0.45 -1,1v4H9v6c0,1.3 0.84,2.4 2,2.82V23h2v-8.18c1.16,-0.41 2,-1.51 2,-2.82V6h-2V2zM21,2c0,-0.55 -0.45,-1 -1,-1s-1,0.45 -1,1v4h-2v6c0,1.3 0.84,2.4 2,2.82V23h2v-8.18c1.16,-0.41 2,-1.51 2,-2.82V6h-2V2z"/></svg>';
  /** webOS has an app per input: com.webos.app.hdmi1, ..., com.webos.app.externalinput.av1. */
  var INPUT_ID = /^com\.webos\.app\.(hdmi\d|externalinput\.(av|component)\d)$/;
  var SAMPLE_INPUTS = [{ id: 'com.webos.app.hdmi1', title: 'HDMI 1' }, { id: 'com.webos.app.hdmi2', title: 'HDMI 2' },
    { id: 'com.webos.app.hdmi3', title: 'HDMI 3' }, { id: 'com.webos.app.externalinput.av1', title: 'AV' }];
  /** Where the selection is: row -1 is the top bar, row 0 the dock, 1 and on the grid. */
  var focus = { row: 0, col: 0 };

  // ---- webOS services -------------------------------------------------------------------------

  var bridges = [];
  function luna(uri, params, callback) {
    if (typeof PalmServiceBridge === 'undefined') { if (callback) callback(null); return; }
    var b = new PalmServiceBridge();
    bridges.push(b);   // kept, or the answer can be collected before it arrives
    b.onservicecallback = function (msg) {
      bridges.splice(bridges.indexOf(b), 1);
      var r = null;
      try { r = JSON.parse(msg); } catch (e) {}
      if (callback) callback(r);
    };
    b.call(uri, JSON.stringify(params || {}));
  }

  function launch(id) {
    if (!id) return;
    if (typeof PalmServiceBridge === 'undefined') { console.log('[GlassTV] would open ' + id); return; }
    luna('luna://com.webos.applicationManager/launch', { id: id });
  }

  /**
   * Sample tiles for the simulator, which has no application manager. A banner in samples/ (kept out of
   * the repository: they are other companies' logos) shows when present; otherwise the name, in words.
   */
  var SAMPLES = [
    ['YouTube', '#e62117', 'youtube'], ['Netflix', '#141414', 'netflix'], ['Disney+', '#0b2f5c', 'disney'],
    ['Apple TV', '#1c1c1e', 'appletv'], ['Viu', '#f5b800', 'viu'], ['Durioo+', '#f08a24', 'durioo'],
    ['Crunchyroll', '#f47521', 'crunchyroll'], ['Prime Video', '#1a98ff', 'prime'], ['Spotify', '#1db954'],
    ['LG Channels', '#c3195d'], ['Live TV', '#0f7b8a'], ['Web Browser', '#3b5bdb'], ['Media Player', '#6a5cff'],
    ['Gallery', '#e8590c'], ['Music', '#d6336c'], ['Settings', '#495057']
  ].map(function (s) {
    return { id: '', title: s[0], color: s[1], banner: s[2] ? 'samples/' + s[2] + '.png' : '', sample: true };
  });

  function loadApps(done) {
    luna('luna://com.webos.applicationManager/listLaunchPoints', {}, function (r) {
      var list = r && r.launchPoints;
      if (!list || !list.length) { inputs = SAMPLE_INPUTS; return done(SAMPLES); }
      // The inputs go in the Inputs menu, not among the apps.
      inputs = list.filter(function (lp) { return INPUT_ID.test(lp.id); }).map(function (lp) {
        return { id: lp.id, title: lp.title };
      });
      done(list.filter(function (lp) { return lp.id !== 'com.cocombee.glasstv' && !INPUT_ID.test(lp.id); }).map(function (lp) {
        return { id: lp.id, title: lp.title, icon: lp.largeIcon || lp.icon, banner: lp.bgImage,
          color: lp.bgColor || lp.iconColor || '#2a2a30' };
      }));
    });
  }

  // ---- tiles -------------------------------------------------------------------------------------

  function rowTop(row) { return row === 0 ? DOCK_TILE_TOP : GRID_TOP + (row - 1) * ROW_PITCH; }

  function build() {
    rowsEl.innerHTML = '';
    var tray = document.createElement('div');
    tray.className = 'tray glass';
    tray.style.top = (DOCK_TILE_TOP - 28) + 'px';
    rowsEl.appendChild(tray);
    buildMenu();
    // The selection lives in the rows too, above the tray's glass and under the tiles.
    rowsEl.appendChild(glider);
    tiles = [];
    var r = null;
    for (var i = 0; i < apps.length; i++) {
      var row = Math.floor(i / COLUMNS), col = i % COLUMNS;
      if (col === 0) {
        r = document.createElement('div');
        r.className = 'row';
        r.style.top = rowTop(row) + 'px';
        rowsEl.appendChild(r);
      }
      var a = apps[i], t = document.createElement('div');
      t.className = 'tile';
      t.style.backgroundColor = a.color;
      if (a.banner) {
        t.style.backgroundImage = 'url("' + a.banner + '")';
        if (a.sample) wordIfMissing(t, a);
      } else if (a.icon) {
        var img = document.createElement('img');
        img.src = a.icon;
        t.appendChild(img);
      } else {
        var w = document.createElement('span');
        w.className = 'word';
        w.textContent = a.title;
        t.appendChild(w);
      }
      r.appendChild(t);
      // The name shows under a grid tile when it is selected; the dock has none.
      var n = document.createElement('div');
      n.className = 'name';
      n.textContent = a.title;
      n.style.left = (LEFT + col * (TILE_W + GAP)) + 'px';
      n.style.top = (rowTop(row) + TILE_H + 14) + 'px';
      rowsEl.appendChild(n);
      tiles.push({ el: t, name: n, app: a });
    }
  }

  function wordIfMissing(tile, a) {
    var probe = new Image();
    probe.onerror = function () {
      tile.style.backgroundImage = 'none';
      var w = document.createElement('span');
      w.className = 'word';
      w.textContent = a.title;
      tile.appendChild(w);
    };
    probe.src = a.banner;
  }

  /** The Inputs menu, under the Inputs and Settings buttons, as on Android. */
  function buildMenu() {
    var glass = document.createElement('div'), items = document.createElement('div');
    glass.id = 'menuGlass';
    glass.className = 'glass';
    items.id = 'menuItems';
    menu.rows = [];
    var sawHdmi = false;
    inputs.forEach(function (input) {
      var hdmi = /hdmi/.test(input.id);
      if (!hdmi && sawHdmi && !menu.rows.some(function (r) { return !r.hdmi; })) {
        var sep = document.createElement('div');
        sep.className = 'msep';
        items.appendChild(sep);
      }
      if (hdmi) sawHdmi = true;
      var row = document.createElement('div');
      row.className = 'mrow';
      row.innerHTML = (hdmi ? HDMI_ICON : AV_ICON) + '<span></span>';
      row.lastChild.textContent = input.title;
      items.appendChild(row);
      menu.rows.push({ input: input, hdmi: hdmi, el: row });
    });
    rowsEl.appendChild(glass);
    rowsEl.appendChild(items);
  }

  /**
   * Puts the menu under the Inputs and Settings buttons, measured when it opens: the buttons change
   * width once the font has loaded, and a menu placed earlier drifted from them.
   */
  function placeMenu() {
    var a = layoutRect(pills[0]), b = layoutRect(pills[1]), items = $('menuItems');
    menu.left = a.left;
    menu.top = a.top + a.height + 19;
    menu.width = b.left + b.width - a.left;
    [$('menuGlass'), items].forEach(function (el) {
      el.style.left = menu.left + 'px';
      el.style.top = menu.top + 'px';
      el.style.width = menu.width + 'px';
      el.style.height = 'auto';
    });
    $('menuGlass').style.height = items.offsetHeight + 'px';
  }

  function openMenu(open) {
    if (open && !inputs.length) { launch('com.webos.app.inputpicker'); return; }
    menu.open = open;
    menu.index = 0;
    if (open) placeMenu();
    $('menuGlass').classList.toggle('open', open);
    $('menuItems').classList.toggle('open', open);
    show();
  }

  function rows() { return Math.ceil(apps.length / COLUMNS); }
  function index(f) { return f.row * COLUMNS + f.col; }

  // ---- the selection ----------------------------------------------------------------------------

  var landTimer = 0;
  /** Moves the selection. {@code landStyle}: the look it takes once it has arrived, if not the same. */
  function placeGlider(x, y, w, h, radius, style, landStyle) {
    clearTimeout(landTimer);
    glider.className = style;
    if (landStyle && landStyle !== style) {
      landTimer = setTimeout(function () { glider.className = landStyle; }, 320);
    }
    glider.style.width = w + 'px';
    glider.style.height = h + 'px';
    glider.style.borderRadius = radius + 'px';
    glider.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    glider.style.opacity = 1;
  }

  function show() {
    tiles.forEach(function (t) { t.el.classList.remove('focus'); t.name.classList.remove('on'); });
    pills.forEach(function (p) { p.classList.remove('selected'); });
    if (menu.open) {
      // A dark row inside the menu's glass.
      rowsEl.style.transform = 'translateY(0)';
      var mr = menu.rows[menu.index].el;
      placeGlider(menu.left + mr.offsetLeft, menu.top + mr.offsetTop, mr.offsetWidth, mr.offsetHeight, 22, 'dark-style');
      hero.style.opacity = 1;
      glow.style.opacity = 0;
      return;
    }
    if (focus.row < 0) {
      pills[focus.col].classList.add('selected');
      // The top bar: a dark pill, and the rows go back to the dock.
      rowsEl.style.transform = 'translateY(0)';
      var p = layoutRect(pills[focus.col]);
      placeGlider(p.left, p.top, p.width, p.height, p.height / 2, 'dark-style');
      hero.style.opacity = 1;
      glow.style.opacity = 0;
      return;
    }
    var shift = focus.row === 0 ? 0 : GRID_SHIFT - (focus.row - 1) * ROW_PITCH;
    rowsEl.style.transform = 'translateY(' + shift + 'px)';
    var t = tiles[index(focus)];
    t.el.classList.add('focus');
    if (focus.row > 0) t.name.classList.add('on');
    // Behind the zoomed tile, worked out from the layout so it lands where the rows are going.
    var w = TILE_W * FOCUS_SCALE, h = TILE_H * FOCUS_SCALE;
    var cx = LEFT + focus.col * (TILE_W + GAP) + TILE_W / 2, cy = rowTop(focus.row) + TILE_H / 2;
    // Down from the top bar it travels dark and turns to glass once it lands, unseen behind the app.
    var fromTop = glider.className === 'dark-style';
    placeGlider(cx - w / 2, cy - h / 2, w, h, 26 * FOCUS_SCALE, fromTop ? 'dark-style' : 'glass-style', 'glass-style');
    // The place shelf belongs to the dock; the room takes the app's colour.
    hero.style.opacity = focus.row === 0 ? 1 : 0;
    glow.style.background = 'radial-gradient(70% 60% at 50% 85%, ' + hexA(t.app.color, 0.45) + ', transparent 70%)';
    glow.style.opacity = 1;
  }

  /**
   * Where an element sits in the page's own 1920 x 1080 layout. Not getBoundingClientRect: the simulator
   * scales the page down to fit its window, and that answers in the scaled size.
   */
  function layoutRect(el) {
    var x = 0, y = 0, w = el.offsetWidth, h = el.offsetHeight;
    for (; el; el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop; }
    return { left: x, top: y, width: w, height: h };
  }

  function hexA(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 'rgba(255,255,255,' + a / 3 + ')';
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function move(dRow, dCol) {
    var f = { row: focus.row, col: focus.col };
    if (dRow < 0 && f.row === 0) {
      f = { row: -1, col: f.col >= COLUMNS / 2 ? 1 : 0 };
    } else if (dRow > 0 && f.row === -1) {
      f = { row: 0, col: f.col === 1 ? COLUMNS - 1 : 0 };
    } else if (f.row === -1) {
      f.col = Math.max(0, Math.min(pills.length - 1, f.col + dCol));
    } else {
      f.row = Math.max(0, Math.min(rows() - 1, f.row + dRow));
      f.col = Math.max(0, f.col + dCol);
      var last = apps.length - 1;
      if (index(f) > last) { f.row = Math.floor(last / COLUMNS); f.col = Math.min(f.col, last % COLUMNS); }
      f.col = Math.min(f.col, COLUMNS - 1);
    }
    focus = f;
    show();
  }

  function menuKey(code) {
    if (code === KEY.UP) {
      if (menu.index === 0) return openMenu(false);   // Up from the top row glides back to Inputs
      menu.index--;
    } else if (code === KEY.DOWN) {
      menu.index = Math.min(menu.rows.length - 1, menu.index + 1);
    } else if (code === KEY.OK) {
      launch(menu.rows[menu.index].input.id);
      return openMenu(false);
    } else if (code === KEY.BACK) {
      return openMenu(false);
    } else {
      return;
    }
    show();
  }

  document.addEventListener('keydown', function (e) {
    if (menu.open) {
      if ([KEY.UP, KEY.DOWN, KEY.OK, KEY.BACK, KEY.LEFT, KEY.RIGHT].indexOf(e.keyCode) >= 0) {
        menuKey(e.keyCode);
        e.preventDefault();
      }
      return;
    }
    switch (e.keyCode) {
      case KEY.LEFT: move(0, -1); break;
      case KEY.RIGHT: move(0, 1); break;
      case KEY.UP: move(-1, 0); break;
      case KEY.DOWN: move(1, 0); break;
      case KEY.OK:
        if (focus.row < 0 && pills[focus.col].id === 'inputs') openMenu(true);
        else if (focus.row < 0) launch(pills[focus.col].getAttribute('data-launch'));
        else launch(tiles[index(focus)].app.id);
        break;
      case KEY.BACK:
        // As Home on Home: back to the first app.
        focus = { row: 0, col: 0 };
        show();
        break;
      default: return;
    }
    e.preventDefault();
  });

  // ---- clock -------------------------------------------------------------------------------------

  function tick() {
    var now = new Date();
    var parts = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).split(' ');
    $('time').textContent = parts[0];
    $('ampm').textContent = parts[1] || '';
    $('date').textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  }

  // ---- places ------------------------------------------------------------------------------------

  var places = [], placeIndex = -1, front = $('wallA'), back = $('wallB');

  function nextPlace() {
    if (!places.length) return;
    placeIndex = (placeIndex + 1) % places.length;
    var p = places[placeIndex], img = new Image();
    img.onload = function () {
      // The words fade out with the old picture and back in with the new one.
      hero.classList.add('out');
      setTimeout(function () {
        $('placeName').textContent = p.name;
        $('placeCountry').textContent = p.country;
        $('placeText').textContent = p.text;
        hero.classList.remove('out');
      }, 250);
      back.style.backgroundImage = 'url("' + p.url + '")';
      back.classList.add('on');
      front.classList.remove('on');
      var t = front; front = back; back = t;
    };
    img.src = p.url;
  }

  // ---- start -------------------------------------------------------------------------------------

  tick();
  setInterval(tick, 10 * 1000);
  loadApps(function (list) {
    apps = list;
    build();
    // "#focus=row,col" starts with that selected, for previews (row -1 is the top bar).
    var m = /focus=(-?\d+),(\d+)/.exec(location.hash);
    if (m) focus = { row: +m[1], col: +m[2] };
    if (/menu/.test(location.hash)) { focus = { row: -1, col: 0 }; openMenu(true); }
    show();
    // The buttons take their final size once the font is in: measure the selection and menu again.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (menu.open) placeMenu(); show(); });
    }
  });
  Places.load(function (list) {
    places = list;
    nextPlace();
    if (places.length > 1) setInterval(nextPlace, ROTATE_MS);
  });
})();
