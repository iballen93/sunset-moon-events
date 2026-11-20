package com.sunsetmoonevents.app.car;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * One qualifying evening, as precomputed by the web app (src/carExport.ts) and saved via
 * @capacitor/preferences into SharedPreferences "CapacitorStorage" under "sunsetmoonevents.carEvents".
 */
final class CarEvent {
    static final String PREFS = "CapacitorStorage";
    static final String KEY = "sunsetmoonevents.carEvents";

    final LocalDate date;
    final boolean fullMoon; // true: sunset + full moonrise; false: sunset + crescent moonset
    final Long sunrise;
    final long sunset;
    final long moonTime;
    final int offsetMin;
    final double illumination;
    final String phaseName;

    private CarEvent(JSONObject o) throws Exception {
        date = LocalDate.parse(o.getString("date"));
        fullMoon = "full".equals(o.getString("type"));
        sunrise = o.isNull("sunrise") ? null : o.getLong("sunrise");
        sunset = o.getLong("sunset");
        moonTime = o.getLong("moonTime");
        offsetMin = o.getInt("offsetMin");
        illumination = o.getDouble("illumination");
        phaseName = o.getString("phaseName");
    }

    static final class Data {
        final String locationLabel;
        final List<CarEvent> all;
        final List<CarEvent> upcoming;
        final YearMonth firstMonth;
        final YearMonth lastMonth;

        Data(String locationLabel, List<CarEvent> all, List<CarEvent> upcoming, YearMonth firstMonth, YearMonth lastMonth) {
            this.locationLabel = locationLabel;
            this.all = all;
            this.upcoming = upcoming;
            this.firstMonth = firstMonth;
            this.lastMonth = lastMonth;
        }

        List<CarEvent> inMonth(YearMonth ym) {
            List<CarEvent> out = new ArrayList<>();
            for (CarEvent e : all) if (YearMonth.from(e.date).equals(ym)) out.add(e);
            return out;
        }
    }

    /** Returns null when the phone app hasn't saved any data yet. */
    static Data load(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY, null);
        if (raw == null) return null;
        try {
            JSONObject root = new JSONObject(raw);
            JSONObject loc = root.getJSONObject("location");
            String label = loc.optString("label", "");
            if (label.isEmpty()) {
                label = String.format("%.2f, %.2f", loc.getDouble("latitude"), loc.getDouble("longitude"));
            }
            LocalDate today = LocalDate.now();
            JSONArray arr = root.getJSONArray("events");
            List<CarEvent> all = new ArrayList<>();
            List<CarEvent> upcoming = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                CarEvent e = new CarEvent(arr.getJSONObject(i));
                all.add(e);
                if (!e.date.isBefore(today)) upcoming.add(e);
            }
            // v1 payloads had no range; fall back to the span of the events themselves.
            YearMonth first = root.has("startDate") ? YearMonth.from(LocalDate.parse(root.getString("startDate")))
                    : (all.isEmpty() ? YearMonth.now() : YearMonth.from(all.get(0).date));
            YearMonth last = root.has("endDate") ? YearMonth.from(LocalDate.parse(root.getString("endDate")))
                    : (all.isEmpty() ? YearMonth.now() : YearMonth.from(all.get(all.size() - 1).date));
            return new Data(label, all, upcoming, first, last);
        } catch (Exception e) {
            return null;
        }
    }
}
