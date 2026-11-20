package com.sunsetmoonevents.app.car;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;

import androidx.core.content.ContextCompat;

import com.sunsetmoonevents.app.R;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Draws the month calendar (same design as the phone: src/components/Calendar.tsx + theme.css)
 * onto the Android Auto surface, inside the area not covered by the content card.
 */
final class CalendarRenderer {
    private static final String[] WEEKDAYS = {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"};

    private final Context ctx;
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);

    /** Tile bounds from the last draw, used to resolve taps. */
    private final Map<LocalDate, RectF> tiles = new HashMap<>();

    CalendarRenderer(Context ctx) {
        this.ctx = ctx;
        stroke.setStyle(Paint.Style.STROKE);
        text.setTextAlign(Paint.Align.CENTER);
    }

    private static final class Palette {
        final int bg, tile, fullTile, newTile, text, muted, today;

        Palette(boolean dark) {
            bg = dark ? 0xFF121212 : 0xFFF4F4F4;
            tile = dark ? 0xFF1E1E1E : 0xFFE6E6E6;
            fullTile = dark ? 0xFF4A3D24 : 0xFFF7E3BC;
            newTile = dark ? 0xFF262C45 : 0xFFD9DEF7;
            text = dark ? Color.WHITE : 0xFF111111;
            muted = dark ? 0xFF9A9A9A : 0xFF666666;
            today = 0xFFE0703A;
        }
    }

    /**
     * @param area      where the weekday header and grid go
     * @param titleArea where the month title goes, or null to put it above the grid
     */
    void draw(Canvas c, Rect area, Rect titleArea, float density, boolean dark, YearMonth ym, List<CarEvent> events) {
        Palette p = new Palette(dark);
        c.drawColor(p.bg);
        tiles.clear();

        Map<LocalDate, CarEvent> byDay = new HashMap<>();
        for (CarEvent e : events) byDay.put(e.date, e);

        float pad = 16 * density;
        float left = area.left + pad, right = area.right - pad;
        float top = area.top + pad, bottom = area.bottom - pad;
        float width = right - left;

        // Month title: above the grid, or in its own area (e.g. beside a short content card).
        float titleSize = Math.min(30 * density, (bottom - top) * 0.07f);
        text.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        text.setTextSize(titleSize);
        text.setColor(p.text);
        String title = ym.getMonth().getDisplayName(TextStyle.FULL, Locale.getDefault()) + " " + ym.getYear();
        float y;
        if (titleArea != null) {
            text.setTextSize(Math.min(34 * density, titleArea.height() * 0.3f));
            c.drawText(title, titleArea.exactCenterX(), titleArea.exactCenterY() + text.getTextSize() * 0.35f, text);
            y = top;
        } else {
            y = top + titleSize;
            c.drawText(title, left + width / 2, y, text);
            y += titleSize * 0.6f;
        }

        // Weekday header
        float gap = 5 * density;
        float colW = (width - gap * 6) / 7f;
        float wdSize = titleSize * 0.5f;
        float wdBaseline = y + wdSize;
        y = wdBaseline + wdSize * 0.7f;

        // Grid
        int lead = ym.atDay(1).getDayOfWeek().getValue() % 7; // Sunday = 0
        int days = ym.lengthOfMonth();
        int rows = (lead + days + 6) / 7;
        float gridH = bottom - y;
        float rowH = (gridH - gap * (rows - 1)) / rows;
        // Keep tiles from getting wider than ~1.3x their height on very wide screens.
        float tileW = Math.min(colW, rowH * 1.3f);
        float gridW = tileW * 7 + gap * 6;
        float gx = left + (width - gridW) / 2;
        float radius = Math.min(tileW, rowH) * 0.14f;

        // Weekday labels, aligned to the (possibly narrower, centered) grid columns.
        text.setTextSize(wdSize);
        text.setColor(p.muted);
        for (int i = 0; i < 7; i++) c.drawText(WEEKDAYS[i], gx + i * (tileW + gap) + tileW / 2, wdBaseline, text);

        float numSize = Math.min(rowH * 0.23f, tileW * 0.32f);
        float metaSize = Math.min(rowH * 0.18f, tileW * 0.25f);
        float iconSize = Math.min(rowH * 0.32f, tileW * 0.56f);
        LocalDate today = LocalDate.now();

        for (int d = 1; d <= days; d++) {
            int idx = lead + d - 1;
            int col = idx % 7, row = idx / 7;
            float tx = gx + col * (tileW + gap);
            float ty = y + row * (rowH + gap);
            RectF r = new RectF(tx, ty, tx + tileW, ty + rowH);
            LocalDate date = ym.atDay(d);
            CarEvent e = byDay.get(date);
            tiles.put(date, r);

            fill.setColor(e == null ? p.tile : (e.fullMoon ? p.fullTile : p.newTile));
            c.drawRoundRect(r, radius, radius, fill);
            if (date.equals(today)) {
                stroke.setColor(p.today);
                stroke.setStrokeWidth(2.5f * density);
                float inset = stroke.getStrokeWidth() / 2;
                c.drawRoundRect(new RectF(r.left + inset, r.top + inset, r.right - inset, r.bottom - inset), radius, radius, stroke);
            }

            // Day number
            text.setColor(p.text);
            text.setTextSize(numSize);
            text.setTypeface(Typeface.create(Typeface.DEFAULT, e != null ? Typeface.BOLD : Typeface.NORMAL));
            c.drawText(String.valueOf(d), r.centerX(), r.top + numSize * 1.15f, text);

            if (e != null) {
                // Icon centered between the number and the two value lines.
                float metaTop = r.bottom - metaSize * 2.5f;
                float areaTop = r.top + numSize * 1.4f;
                float iconCy = (areaTop + metaTop) / 2;
                Drawable icon = ContextCompat.getDrawable(ctx, e.fullMoon ? R.drawable.ic_car_full_moon : R.drawable.ic_car_crescent);
                if (icon != null) {
                    int half = Math.round(iconSize / 2);
                    icon.setBounds(Math.round(r.centerX()) - half, Math.round(iconCy) - half,
                            Math.round(r.centerX()) + half, Math.round(iconCy) + half);
                    icon.draw(c);
                }
                // Offset stacked above illumination, centered.
                text.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
                text.setTextSize(metaSize);
                c.drawText(shortOffset(e.offsetMin), r.centerX(), r.bottom - metaSize * 1.35f, text);
                c.drawText(Math.round(e.illumination * 100) + "%", r.centerX(), r.bottom - metaSize * 0.3f, text);
            }
        }
    }

    /** Approximate tile area (px²) the grid would get in this layout; mirrors the math in draw(). */
    static float tileScore(Rect area, boolean titleAbove, float density, YearMonth ym) {
        float pad = 16 * density, gap = 5 * density;
        float w = area.width() - 2 * pad, h = area.height() - 2 * pad;
        float titleSize = Math.min(30 * density, h * 0.07f);
        float header = (titleAbove ? titleSize * 1.6f : 0) + titleSize * 0.5f * 1.7f;
        int rows = (ym.atDay(1).getDayOfWeek().getValue() % 7 + ym.lengthOfMonth() + 6) / 7;
        float rowH = (h - header - gap * (rows - 1)) / rows;
        float tileW = Math.min((w - gap * 6) / 7f, rowH * 1.3f);
        return rowH <= 0 || tileW <= 0 ? 0 : rowH * tileW;
    }

    /** Returns the event day at a surface coordinate, or null. */
    LocalDate dayAt(float x, float y) {
        for (Map.Entry<LocalDate, RectF> t : tiles.entrySet()) {
            if (t.getValue().contains(x, y)) return t.getKey();
        }
        return null;
    }

    /** Same compact format as the phone tiles: "−16m", "+1:15". */
    static String shortOffset(int min) {
        String sign = min < 0 ? "−" : "+";
        int abs = Math.abs(min);
        if (abs < 60) return sign + abs + "m";
        return sign + (abs / 60) + ":" + String.format(Locale.US, "%02d", abs % 60);
    }
}
