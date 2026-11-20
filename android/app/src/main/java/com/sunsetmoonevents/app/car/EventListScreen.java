package com.sunsetmoonevents.app.car;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.constraints.ConstraintManager;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.MessageTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.core.graphics.drawable.IconCompat;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

import com.sunsetmoonevents.app.R;

/** Upcoming sunset + full-moonrise and sunset + crescent-moonset evenings. */
public class EventListScreen extends Screen {
    private static final int DEFAULT_LIMIT = 6;

    public EventListScreen(@NonNull CarContext carContext) {
        super(carContext);
        // Re-read data whenever the screen comes back, in case the phone app refreshed it.
        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override
            public void onStart(@NonNull LifecycleOwner owner) {
                invalidate();
            }
        });
    }

    static CarIcon icon(CarContext ctx, boolean fullMoon) {
        int res = fullMoon ? R.drawable.ic_car_full_moon : R.drawable.ic_car_crescent;
        return new CarIcon.Builder(IconCompat.createWithResource(ctx, res)).build();
    }

    private int listLimit() {
        try {
            return getCarContext().getCarService(ConstraintManager.class)
                    .getContentLimit(ConstraintManager.CONTENT_LIMIT_TYPE_LIST);
        } catch (Exception e) {
            return DEFAULT_LIMIT;
        }
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        CarEvent.Data data = CarEvent.load(getCarContext());
        if (data == null) {
            return new MessageTemplate.Builder(
                    "Open Sunset Moon Events on your phone and set a location to see upcoming evenings here.")
                    .setTitle("Sunset Moon Events")
                    .setHeaderAction(Action.APP_ICON)
                    .build();
        }

        ItemList.Builder list = new ItemList.Builder()
                .setNoItemsMessage("No qualifying evenings saved. Open Sunset Moon Events on your phone to refresh.");

        int limit = listLimit();
        for (int i = 0; i < data.upcoming.size() && i < limit; i++) {
            CarEvent e = data.upcoming.get(i);
            String moonLabel = e.fullMoon ? "Moonrise" : "Moonset";
            list.addItem(new Row.Builder()
                    .setTitle(Fmt.day(e.date) + " · " + (e.fullMoon ? "Full moonrise" : "Crescent moonset"))
                    .addText(Fmt.offset(e.offsetMin) + " · " + Fmt.pct(e.illumination) + " lit")
                    .addText("Sunset " + Fmt.time(getCarContext(), e.sunset) + " · "
                            + moonLabel + " " + Fmt.time(getCarContext(), e.moonTime))
                    .setImage(icon(getCarContext(), e.fullMoon), Row.IMAGE_TYPE_LARGE)
                    .setBrowsable(true)
                    .setOnClickListener(() -> getScreenManager().push(new EventDetailScreen(getCarContext(), e)))
                    .build());
        }

        return new ListTemplate.Builder()
                .setTitle("Sunset Moon Events · " + data.locationLabel)
                .setHeaderAction(Action.APP_ICON)
                .setSingleList(list.build())
                .build();
    }
}
