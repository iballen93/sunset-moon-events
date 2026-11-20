package com.sunsetmoonevents.app.car;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

/** Exact times and illumination for one evening (mirrors the phone's day detail). */
public class EventDetailScreen extends Screen {
    private final CarEvent event;

    EventDetailScreen(@NonNull CarContext carContext, @NonNull CarEvent event) {
        super(carContext);
        this.event = event;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        CarContext ctx = getCarContext();
        CarEvent e = event;
        String moonLabel = e.fullMoon ? "Moonrise" : "Moonset";
        String illumLabel = e.fullMoon ? "Illumination at sunset" : "Illumination at moonset";

        Pane pane = new Pane.Builder()
                .addRow(new Row.Builder()
                        .setTitle(e.fullMoon ? "Sunset + Full Moonrise" : "Sunset + Crescent Moonset")
                        .addText("Moon " + (e.fullMoon ? "rises " : "sets ") + Fmt.offset(e.offsetMin)
                                + (e.fullMoon ? " from sunset" : " after sunset"))
                        .setImage(EventListScreen.icon(ctx, e.fullMoon), Row.IMAGE_TYPE_LARGE)
                        .build())
                .addRow(new Row.Builder()
                        .setTitle("Sunset " + Fmt.time(ctx, e.sunset) + " · " + moonLabel + " " + Fmt.time(ctx, e.moonTime))
                        .addText("Sunrise " + Fmt.time(ctx, e.sunrise))
                        .build())
                .addRow(new Row.Builder()
                        .setTitle(illumLabel + ": " + Fmt.pct(e.illumination))
                        .addText(e.phaseName)
                        .build())
                .build();

        String date = e.date.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.getDefault())
                + ", " + e.date.getMonth().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.getDefault())
                + " " + e.date.getDayOfMonth();

        return new PaneTemplate.Builder(pane)
                .setTitle(date)
                .setHeaderAction(Action.BACK)
                .build();
    }
}
