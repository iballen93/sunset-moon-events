import { IonRefresher, IonRefresherContent } from '@ionic/react';
import { Capacitor } from '@capacitor/core';

/**
 * Pull down to reload the page, on the website only. Ionic locks the page body, which turns off
 * the browser's own pull-down-to-refresh, so every scrolling page (the calendar and the location
 * page, which opens in its own panel) needs one of these as the first child of its IonContent.
 */
export function PullToRefresh() {
  if (Capacitor.isNativePlatform()) return null;
  return (
    <IonRefresher slot="fixed" onIonRefresh={() => window.location.reload()}>
      <IonRefresherContent />
    </IonRefresher>
  );
}
