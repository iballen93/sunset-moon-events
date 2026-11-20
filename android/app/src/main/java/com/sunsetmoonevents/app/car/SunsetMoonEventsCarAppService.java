package com.sunsetmoonevents.app.car;

import android.content.Intent;
import android.content.res.Configuration;

import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.versioning.CarAppApiLevels;
import androidx.car.app.Screen;
import androidx.car.app.ScreenManager;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;

/** Android Auto entry point. */
public class SunsetMoonEventsCarAppService extends CarAppService {
    @NonNull
    @Override
    public HostValidator createHostValidator() {
        // Personal/sideloaded build: accept any host (Android Auto, Desktop Head Unit).
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @NonNull
    @Override
    public Session onCreateSession() {
        return new Session() {
            @NonNull
            @Override
            public Screen onCreateScreen(@NonNull Intent intent) {
                // The full-screen calendar needs MapWithContentTemplate (Car API 7); older hosts get the list.
                if (getCarContext().getCarAppApiLevel() >= CarAppApiLevels.LEVEL_7) {
                    return new CalendarScreen(getCarContext());
                }
                return new EventListScreen(getCarContext());
            }

            @Override
            public void onCarConfigurationChanged(@NonNull Configuration newConfiguration) {
                // App moved between the large panel, small panel, or full screen: re-pick the layout.
                getCarContext().getCarService(ScreenManager.class).getTop().invalidate();
            }
        };
    }
}
