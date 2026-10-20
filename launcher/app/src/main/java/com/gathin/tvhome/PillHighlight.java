package com.gathin.tvhome;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.view.View;

import androidx.dynamicanimation.animation.FloatPropertyCompat;

import java.util.ArrayList;
import java.util.List;

/**
 * The white focus shape of the top bar. One shape glides between the pills instead of each pill
 * lighting up on its own, and because its left and right edges move on separate springs it changes
 * shape on the way: the wide Inputs pill shrinks into the Settings circle, and the circle stretches
 * back out into the pill.
 *
 * <p>The pills keep their glass the whole time. This view sits behind them and shows the shape in
 * the gaps between pills; over a pill, the pill paints the same shape itself on top of its glass
 * (see {@link #drawShape}), so the white slides across glass that stays where it is. Moving it only
 * redraws round rects; it never asks for a new layout.
 */
final class PillHighlight extends View {

    static final FloatPropertyCompat<PillHighlight> LEFT = new FloatPropertyCompat<PillHighlight>("pillLeft") {
        @Override
        public float getValue(PillHighlight v) {
            return v.left;
        }

        @Override
        public void setValue(PillHighlight v, float value) {
            v.left = value;
            v.changed();
        }
    };

    static final FloatPropertyCompat<PillHighlight> RIGHT = new FloatPropertyCompat<PillHighlight>("pillRight") {
        @Override
        public float getValue(PillHighlight v) {
            return v.right;
        }

        @Override
        public void setValue(PillHighlight v, float value) {
            v.right = value;
            v.changed();
        }
    };

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final List<View> pills = new ArrayList<>();
    private float left, right;
    private float opacity;

    PillHighlight(Context context) {
        super(context);
        setFocusable(false);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }

    /** A pill that paints the shape where it overlaps it, and so redraws whenever the shape moves. */
    void addPill(View pill) {
        pills.add(pill);
    }

    /** Puts the shape straight onto a pill, with no glide. */
    void setEdges(float left, float right) {
        this.left = left;
        this.right = right;
        changed();
    }

    /** 0 hidden, 1 fully shown. */
    void setOpacity(float opacity) {
        this.opacity = opacity;
        changed();
    }

    boolean isShowing() {
        return opacity > 0f && right > left;
    }

    /** Draws the shape on {@code canvas}, whose origin sits at (dx, dy) from this view's own. */
    void drawShape(Canvas canvas, float dx, float dy) {
        float h = getHeight();
        if (!isShowing() || h <= 0) return;
        paint.setColor(((int) (0xF5 * opacity) << 24) | 0xFFFFFF);
        // Fully round ends at any width: a pill when wide, a circle once it is as wide as it is tall.
        float r = Math.min(h, right - left) / 2f;
        canvas.drawRoundRect(left + dx, dy, right + dx, h + dy, r, r, paint);
    }

    private void changed() {
        invalidate();
        for (int i = 0; i < pills.size(); i++) pills.get(i).invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        drawShape(canvas, 0f, 0f);
    }
}
