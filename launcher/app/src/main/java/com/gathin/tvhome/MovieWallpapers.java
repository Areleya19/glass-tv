package com.gathin.tvhome;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Wallpapers from recent movies: once a day, asks TMDB (themoviedb.org) for the most popular films
 * released in the last couple of months and keeps their backdrop pictures in a folder the launcher
 * rotates through. Off unless config.json carries a tmdb_api_key; the only network use in the launcher.
 *
 * Runs on a background thread; every failure just leaves the previous pictures in place.
 */
final class MovieWallpapers {
    private static final String TAG = "TvHome.Movies";
    static final String DIR = "movie-wallpapers";
    private static final long REFRESH_MS = 24L * 60 * 60 * 1000;
    private static final int KEEP = 10;
    /** TMDB genre ids left out by default: Horror and Thriller, so a family room isn't greeted by a scary still. */
    private static final String DEFAULT_EXCLUDED_GENRES = "27,53";

    private MovieWallpapers() {
    }

    static File dir(Context ctx) {
        File base = Config.dir(ctx);
        return base != null ? new File(base, DIR) : null;
    }

    /** The pictures on disk, newest download first in name order; empty when none. */
    static List<File> list(Context ctx) {
        List<File> out = new ArrayList<>();
        File d = dir(ctx);
        File[] files = d != null ? d.listFiles() : null;
        if (files == null) return out;
        for (File f : files) {
            if (f.isFile() && f.length() > 0 && f.getName().endsWith(".jpg")) out.add(f);
        }
        Collections.sort(out);
        return out;
    }

    /** True when a day has passed since the last successful refresh. */
    static boolean due(Context ctx) {
        long last = prefs(ctx).getLong("refreshed_at", 0);
        return System.currentTimeMillis() - last >= REFRESH_MS || list(ctx).isEmpty();
    }

    /**
     * Downloads the current list. Blocking: call from a background thread. Returns true when the
     * folder changed.
     */
    static boolean refresh(Context ctx, Config cfg) {
        File d = dir(ctx);
        if (d == null || cfg.tmdbApiKey.isEmpty()) return false;
        try {
            if (!d.isDirectory() && !d.mkdirs()) return false;
            SimpleDateFormat day = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
            long now = System.currentTimeMillis();
            String from = day.format(new Date(now - 75L * 24 * 60 * 60 * 1000));
            String to = day.format(new Date(now));
            String excluded = cfg.movieExcludedGenres.isEmpty() ? DEFAULT_EXCLUDED_GENRES : cfg.movieExcludedGenres;
            StringBuilder q = new StringBuilder("https://api.themoviedb.org/3/discover/movie?include_adult=false"
                    + "&sort_by=popularity.desc&vote_count.gte=20&primary_release_date.gte=" + from
                    + "&primary_release_date.lte=" + to + "&without_genres=" + enc(excluded));
            // The title and the overview come back in the TV's own language when TMDB has them,
            // and in English where it does not, which is the same fallback TMDB's own apps use.
            q.append("&language=").append(enc(Locale.getDefault().toLanguageTag()));
            if (!cfg.movieRegion.isEmpty()) q.append("&region=").append(enc(cfg.movieRegion));
            if (!cfg.movieGenres.isEmpty()) q.append("&with_genres=").append(enc(cfg.movieGenres));
            boolean bearer = cfg.tmdbApiKey.length() > 40;   // v4 read access token; a v3 key is 32 characters
            if (!bearer) q.append("&api_key=").append(enc(cfg.tmdbApiKey));

            JSONObject page = new JSONObject(new String(get(q.toString(), bearer ? cfg.tmdbApiKey : null, 512 * 1024),
                    StandardCharsets.UTF_8));
            JSONArray results = page.optJSONArray("results");
            if (results == null) return false;

            Set<String> wanted = new HashSet<>();
            int n = 0;
            for (int i = 0; i < results.length() && n < KEEP; i++) {
                JSONObject m = results.optJSONObject(i);
                if (m == null || m.optBoolean("adult", false)) continue;
                String backdrop = m.optString("backdrop_path", "");
                if (backdrop.isEmpty() || backdrop.equals("null")) continue;
                // The rank leads the name so the rotation follows popularity; the id keeps it unique.
                String base = String.format(Locale.ROOT, "%02d-%d", n, m.optLong("id"));
                n++;
                // w1280 is plenty for a blurred backdrop, and a quarter of the original's pixels on a 1 GB TV.
                download(d, base + ".jpg", "https://image.tmdb.org/t/p/w1280" + backdrop, wanted);
                // The shelf names the film, so keep the two fields it shows: title first, overview after.
                saveText(d, base + ".txt", m.optString("title", ""), m.optString("overview", ""), wanted);
            }
            if (n == 0) return false;
            // Pictures that dropped out of the list, and leftovers of an interrupted download.
            File[] old = d.listFiles();
            if (old != null) for (File f : old) if (!wanted.contains(f.getName())) f.delete();
            prefs(ctx).edit().putLong("refreshed_at", now).apply();
            return true;
        } catch (Exception e) {
            Log.w(TAG, "refresh failed: " + e);
            return false;
        }
    }

    /** Saves one picture unless it is already there; the name joins the keep list either way. */
    private static void download(File d, String name, String url, Set<String> wanted) throws Exception {
        wanted.add(name);
        File out = new File(d, name);
        if (out.isFile() && out.length() > 0) return;
        byte[] img = get(url, null, 2 * 1024 * 1024);
        File tmp = new File(d, name + ".part");
        try (OutputStream os = new FileOutputStream(tmp)) {
            os.write(img);
        }
        if (!tmp.renameTo(out)) tmp.delete();
    }

    /** Title and overview beside the picture, so the shelf costs no network call of its own. */
    private static void saveText(File d, String name, String title, String overview, Set<String> wanted) {
        wanted.add(name);
        if (title.isEmpty()) return;
        File out = new File(d, name);
        if (out.isFile() && out.length() > 0) return;
        // One line each, so a stray newline in the overview cannot be read back as a title.
        String body = title.replace('\n', ' ') + "\n" + overview.replace('\n', ' ');
        try (OutputStream os = new FileOutputStream(out)) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            Log.w(TAG, "could not save " + name + ": " + e);
        }
    }

    /**
     * The film's title and overview for a picture this class saved, or null when there is none:
     * the user's own wallpapers have no sidecar, and neither do pictures kept from an older version.
     */
    static String[] describe(File picture) {
        if (picture == null) return null;
        String name = picture.getName();
        if (!name.endsWith(".jpg")) return null;
        File text = new File(picture.getParentFile(), name.substring(0, name.length() - 4) + ".txt");
        if (!text.isFile() || text.length() == 0 || text.length() > 8192) return null;
        try (java.io.BufferedReader r = new java.io.BufferedReader(
                new java.io.InputStreamReader(new java.io.FileInputStream(text), StandardCharsets.UTF_8))) {
            String title = r.readLine();
            if (title == null || title.trim().isEmpty()) return null;
            String overview = r.readLine();
            return new String[]{title.trim(), overview == null ? "" : overview.trim()};
        } catch (Exception e) {
            return null;
        }
    }

    private static byte[] get(String url, String bearer, int maxBytes) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setRequestProperty("Accept", "application/json, image/jpeg");
        if (bearer != null) c.setRequestProperty("Authorization", "Bearer " + bearer);
        try {
            if (c.getResponseCode() != 200) throw new IllegalStateException("HTTP " + c.getResponseCode());
            try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buf = new byte[16 * 1024];
                int r;
                while ((r = in.read(buf)) > 0) {
                    out.write(buf, 0, r);
                    if (out.size() > maxBytes) throw new IllegalStateException("response too large");
                }
                return out.toByteArray();
            }
        } finally {
            c.disconnect();
        }
    }

    private static String enc(String s) throws Exception {
        return URLEncoder.encode(s, "UTF-8");
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences("movie_wallpapers", Context.MODE_PRIVATE);
    }
}
