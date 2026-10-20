package com.gathin.tvhome;

import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.view.View;

import androidx.annotation.NonNull;

/**
 * A top-bar pill in the glass style: the blurred wallpaper behind it, an even veil, and an edge
 * that shines at the top-left and bottom-right (GlassRim), with no brighter top. The glass stays
 * when the pill is focused; the white is the top bar's gliding highlight, painted over it.
 */
final class GlassDrawable extends Drawable {

    private final View owner;
    private final float radius;
    private final Backdrop.Fill fill = new Backdrop.Fill();
    private final Paint veil = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final GlassRim rim;
    private final PillHighlight highlight;
    private final int[] at = new int[2], highlightAt = new int[2];
    private final RectF rect = new RectF();

    GlassDrawable(View owner, float radius, float density, PillHighlight highlight) {
        this.owner = owner;
        this.highlight = highlight;
        this.radius = radius;
        veil.setColor(0x14FFFFFF);
        rim = new GlassRim(1.5f * density, 0xD9FFFFFF, 0x1AFFFFFF);
    }

    @Override
    public void draw(@NonNull Canvas canvas) {
        rect.set(getBounds());
        fill.draw(canvas, owner, rect, radius, 1f);
        canvas.drawRoundRect(rect, radius, radius, veil);
        float half = rim.paint.getStrokeWidth() / 2f;
        rect.inset(half, half);
        rim.fit(rect);
        canvas.drawRoundRect(rect, radius - half, radius - half, rim.paint);
        // The top bar's focus shape glides behind the pills. Over this pill, paint the part of it
        // that overlaps on top of the glass, so the white slides across glass that stays put.
        if (highlight != null && highlight.isShowing()) {
            owner.getLocationInWindow(at);
            highlight.getLocationInWindow(highlightAt);
            canvas.save();
            canvas.clipRect(getBounds());
            highlight.drawShape(canvas, highlightAt[0] - at[0], highlightAt[1] - at[1]);
            canvas.restore();
        }
    }

    @Override
    public void setAlpha(int alpha) {
    }

    @Override
    public void setColorFilter(ColorFilter colorFilter) {
    }

    @Override
    public int getOpacity() {
        return PixelFormat.TRANSLUCENT;
    }
}
