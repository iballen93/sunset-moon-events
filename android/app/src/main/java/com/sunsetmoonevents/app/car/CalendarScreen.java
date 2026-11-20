package com.sunsetmoonevents.app.car;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.view.Surface;

import androidx.annotation.NonNull;
import androidx.car.app.AppManager;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.SurfaceCallback;
import androidx.car.app.SurfaceContainer;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.MessageTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.model.MapController;
import androidx.car.app.navigation.model.MapWithContentTemplate;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

/**
 * Full-screen month calendar drawn on the car surface (the "map" area of MapWithContentTemplate),
 * with a card listing the month's evenings and buttons to change month.
 */
public class CalendarScreen extends Screen implements SurfaceCallback {
    /** Bottom edge of the month-controls card (header + message + button), measured on Android Auto. */
    private static final int CONTROL_CARD_HEIGHT_DP = 290;

    private final CalendarRenderer renderer;
    private CarEvent.Data data;
    private YearMonth month = YearMonth.now();

    private SurfaceContainer surface;
    private Rect visibleArea;

    private final SharedPreferences.OnSharedPreferenceChangeListener prefsListener = (prefs, key) -> {
        if (CarEvent.KEY.equals(key)) reload();
    };

    public CalendarScreen(@NonNull CarContext carContext) {
        super(carContext);
        renderer = new CalendarRenderer(carContext);
        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override
            public void onCreate(@NonNull LifecycleOwner owner) {
                getCarContext().getCarService(AppManager.class).setSurfaceCallback(CalendarScreen.this);
            }

            @Override
            public void onStart(@NonNull LifecycleOwner owner) {
                prefs().registerOnSharedPreferenceChangeListener(prefsListener);
                reload();
            }

            @Override
            public void onStop(@NonNull LifecycleOwner owner) {
                prefs().unregisterOnSharedPreferenceChangeListener(prefsListener);
            }
        });
    }

    private SharedPreferences prefs() {
        return getCarContext().getSharedPreferences(CarEvent.PREFS, Context.MODE_PRIVATE);
    }

    private void reload() {
        data = CarEvent.load(getCarContext());
        if (data != null) month = clamp(month);
        invalidate();
        render();
    }

    private YearMonth clamp(YearMonth ym) {
        if (ym.isBefore(data.firstMonth)) return data.firstMonth;
        if (ym.isAfter(data.lastMonth)) return data.lastMonth;
        return ym;
    }

    private void showMonth(YearMonth ym) {
        month = clamp(ym);
        invalidate();
        render();
    }

    // ---- Surface ------------------------------------------------------------------------------

    @Override
    public void onSurfaceAvailable(@NonNull SurfaceContainer container) {
        surface = container;
        render();
    }

    @Override
    public void onVisibleAreaChanged(@NonNull Rect area) {
        visibleArea = area;
        render();
    }

    @Override
    public void onSurfaceDestroyed(@NonNull SurfaceContainer container) {
        surface = null;
    }

    @Override
    public void onClick(float x, float y) {
        if (data == null) return;
        LocalDate day = renderer.dayAt(x, y);
        if (day == null) return;
        for (CarEvent e : data.all) {
            if (e.date.equals(day)) {
                getScreenManager().push(new EventDetailScreen(getCarContext(), e));
                return;
            }
        }
    }

    private void render() {
        if (surface == null || data == null) return;
        Surface s = surface.getSurface();
        if (s == null || !s.isValid()) return;
        Rect area = visibleArea != null && !visibleArea.isEmpty()
                ? visibleArea : new Rect(0, 0, surface.getWidth(), surface.getHeight());
        float density = surface.getDpi() / 160f;
        Rect gridArea = area;
        Rect titleArea = null;
        if (layout() == Layout.CALENDAR && visibleArea != null && !visibleArea.isEmpty()) {
            // The host reports the whole column under the content card as covered, but in calendar
            // mode the card is short. Try the full width below it, with the title beside the card,
            // and keep whichever arrangement gives bigger tiles.
            int cardBottom = Math.round(CONTROL_CARD_HEIGHT_DP * density);
            Rect below = new Rect(0, cardBottom, area.right, area.bottom);
            if (CalendarRenderer.tileScore(below, false, density, month)
                    > CalendarRenderer.tileScore(area, true, density, month)) {
                gridArea = below;
                titleArea = new Rect(area.left, area.top, area.right, cardBottom);
            }
        }
        Canvas c;
        try {
            c = s.lockCanvas(null);
        } catch (IllegalArgumentException | IllegalStateException e) {
            // Surface is mid-setup, or still held by a previous process (e.g. right after a
            // reinstall); the host calls back with a fresh one when the app is reopened.
            return;
        }
        try {
            renderer.draw(c, gridArea, titleArea, density, true, month, data.inMonth(month));
        } finally {
            s.unlockCanvasAndPost(c);
        }
    }

    // ---- Template -----------------------------------------------------------------------------

    @NonNull
    @Override
    public Template onGetTemplate() {
        if (data == null) {
            return new MessageTemplate.Builder(
                    "Open Sunset Moon Events on your phone and set a location to see the calendar here.")
                    .setTitle("Sunset Moon Events")
                    .setHeaderAction(Action.APP_ICON)
                    .build();
        }

        String monthName = month.getMonth().getDisplayName(TextStyle.FULL, Locale.getDefault()) + " " + month.getYear();
        List<CarEvent> events = data.inMonth(month);
        Layout layout = layout();

        if (layout == Layout.LIST) {
            // Narrow side panel: plain list, no calendar surface.
            return new ListTemplate.Builder()
                    .setTitle(monthName)
                    .setHeaderAction(Action.APP_ICON)
                    .setSingleList(eventList(events, monthName))
                    .setActionStrip(monthStrip())
                    .build();
        }

        Template content;
        if (layout == Layout.FULL) {
            content = new ListTemplate.Builder()
                    .setTitle(monthName)
                    .setHeaderAction(Action.APP_ICON)
                    .setSingleList(eventList(events, monthName))
                    .build();
        } else {
            // Calendar only: the host requires a content card here, so keep it to month controls.
            MessageTemplate.Builder m = new MessageTemplate.Builder(
                    events.size() + (events.size() == 1 ? " evening" : " evenings") + " · tap a day for details")
                    .setTitle(monthName)
                    .setHeaderAction(Action.APP_ICON);
            if (month.isAfter(data.firstMonth)) {
                m.addAction(new Action.Builder().setTitle("‹ Prev")
                        .setOnClickListener(() -> showMonth(month.minusMonths(1))).build());
            }
            if (month.isBefore(data.lastMonth)) {
                m.addAction(new Action.Builder().setTitle("Next ›")
                        .setOnClickListener(() -> showMonth(month.plusMonths(1))).build());
            }
            content = m.build();
        }

        // Android Auto only forwards taps on the surface (onClick) when the template has a map
        // action strip, so add a minimal one with the host's standard pan button.
        MapController mapController = new MapController.Builder()
                .setMapActionStrip(new ActionStrip.Builder().addAction(Action.PAN).build())
                .setPanModeListener(isInPanMode -> { })
                .build();
        MapWithContentTemplate.Builder t = new MapWithContentTemplate.Builder()
                .setContentTemplate(content)
                .setMapController(mapController);
        ActionStrip strip = layout == Layout.FULL ? monthStrip() : todayStrip();
        if (strip != null) t.setActionStrip(strip);
        return t.build();
    }

    /** Which panel the app is in, judged from the shape of its area. */
    private enum Layout { FULL, CALENDAR, LIST }

    private Layout layout() {
        android.content.res.Configuration cfg = getCarContext().getResources().getConfiguration();
        if (cfg.screenHeightDp <= 0) return Layout.CALENDAR;
        float ratio = cfg.screenWidthDp / (float) cfg.screenHeightDp;
        if (ratio >= 1.45f) return Layout.FULL;   // e.g. 1824x1056
        if (ratio >= 0.85f) return Layout.CALENDAR; // e.g. 1192x1056 (large side)
        return Layout.LIST;                        // e.g. 600x1056 (small side)
    }

    private ItemList eventList(List<CarEvent> events, String monthName) {
        ItemList.Builder list = new ItemList.Builder().setNoItemsMessage("No qualifying evenings in " + monthName);
        for (CarEvent e : events) {
            list.addItem(new Row.Builder()
                    .setTitle(Fmt.day(e.date) + " · " + (e.fullMoon ? "Full moonrise" : "Crescent moonset"))
                    .addText(Fmt.offset(e.offsetMin) + " · " + Fmt.pct(e.illumination) + " lit · Sunset "
                            + Fmt.time(getCarContext(), e.sunset))
                    .setImage(EventListScreen.icon(getCarContext(), e.fullMoon), Row.IMAGE_TYPE_SMALL)
                    .setBrowsable(true)
                    .setOnClickListener(() -> getScreenManager().push(new EventDetailScreen(getCarContext(), e)))
                    .build());
        }
        return list.build();
    }

    /** Prev / Next / Today, whichever apply. Null if none do. */
    private ActionStrip monthStrip() {
        ActionStrip.Builder strip = new ActionStrip.Builder();
        boolean any = false;
        if (month.isAfter(data.firstMonth)) {
            strip.addAction(new Action.Builder().setTitle("‹ Prev")
                    .setOnClickListener(() -> showMonth(month.minusMonths(1))).build());
            any = true;
        }
        if (month.isBefore(data.lastMonth)) {
            strip.addAction(new Action.Builder().setTitle("Next ›")
                    .setOnClickListener(() -> showMonth(month.plusMonths(1))).build());
            any = true;
        }
        if (!month.equals(YearMonth.now())) {
            strip.addAction(new Action.Builder().setTitle("Today")
                    .setOnClickListener(() -> showMonth(YearMonth.now())).build());
            any = true;
        }
        return any ? strip.build() : null;
    }

    private ActionStrip todayStrip() {
        if (month.equals(YearMonth.now())) return null;
        return new ActionStrip.Builder().addAction(new Action.Builder().setTitle("Today")
                .setOnClickListener(() -> showMonth(YearMonth.now())).build()).build();
    }
}
