package com.sunsetmoonevents.app.car;

import android.content.Context;
import android.text.format.DateFormat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Formatting that matches the phone UI (src/format.ts). */
final class Fmt {
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE, MMM d", Locale.getDefault());

    static String time(Context ctx, Long epochMs) {
        if (epochMs == null) return "—";
        String pattern = DateFormat.is24HourFormat(ctx) ? "H:mm" : "h:mm a";
        return DateTimeFormatter.ofPattern(pattern, Locale.getDefault())
                .format(Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()));
    }

    static String day(LocalDate d) {
        LocalDate today = LocalDate.now();
        if (d.equals(today)) return "Tonight";
        if (d.equals(today.plusDays(1))) return "Tomorrow";
        return DAY.format(d);
    }

    static String offset(int min) {
        String sign = min < 0 ? "−" : "+";
        int abs = Math.abs(min);
        int h = abs / 60;
        int m = abs % 60;
        return sign + (h > 0 ? h + "h " : "") + m + "m";
    }

    static String pct(double f) {
        return f < 0.1 ? String.format(Locale.getDefault(), "%.1f%%", f * 100)
                : String.format(Locale.getDefault(), "%.0f%%", f * 100);
    }
}
