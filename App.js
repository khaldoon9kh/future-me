import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

// expo-share-intent requires a custom dev build (EAS Build).
// It will not function in standard Expo Go — see SETUP.md for instructions.
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';

import RootNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notificationService';
import { processShareIntent } from './src/services/shareIntentService';

// Configure how notifications are displayed while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Inner component that consumes the ShareIntentProvider context.
 * Kept separate so it can use the useShareIntentContext hook.
 */
function AppContent({ navigationRef }) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  // Navigate to QuickAdd whenever a share intent arrives
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const processed = processShareIntent(shareIntent);
      // Small delay to ensure navigator is ready
      setTimeout(() => {
        navigationRef.current?.navigate('QuickAdd', {
          sharedUrl: processed.url,
          sharedTitle: processed.title,
          sharedNotes: processed.notes,
        });
      }, 300);
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  // Listen for notification taps and navigate to the relevant item
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const itemId = response.notification.request.content.data?.itemId;
      if (itemId) {
        setTimeout(() => {
          navigationRef.current?.navigate('ItemDetails', { itemId });
        }, 300);
      }
    });
    return () => sub.remove();
  }, []);

  // Ask for notification permissions on first launch
  useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  return <RootNavigator />;
}

export default function App() {
  const navigationRef = useRef(null);

  return (
    <ShareIntentProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        <AppContent navigationRef={navigationRef} />
      </NavigationContainer>
    </ShareIntentProvider>
  );
}
