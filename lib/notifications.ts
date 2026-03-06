// lib/notifications.ts
// Web-safe push notification registration.
// On web/Vite, expo-modules-core is unavailable — this file gracefully returns null
// without crashing the build. On a native Expo app, it registers for push tokens.

export async function registerForPushNotifications(): Promise<string | null> {
  // Guard: only attempt push registration in a native Expo environment.
  // On web (Vite/localhost), navigator is available and Platform is not.
  if (typeof navigator !== 'undefined' && !('ExpoModules' in globalThis)) {
    console.log('[Push] Skipping push registration on web environment');
    return null;
  }

  try {
    // Dynamic imports — only resolved at runtime in a native Expo context.
    // This prevents esbuild from trying to statically bundle expo-modules-core.
    const [
      { default: Notifications },
      { default: Device },
      { default: Constants },
    ] = await Promise.all([
      import('expo-notifications'),
      import('expo-device'),
      import('expo-constants'),
    ]);

    if (!Device.isDevice) {
      console.warn('[Push] Must use physical device for push notifications');
      return null;
    }

    const { status: existingStatus } = (await Notifications.getPermissionsAsync()) as { status: string };
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = (await Notifications.requestPermissionsAsync()) as { status: string };
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Push notification permission not granted');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error('[Push] Missing Expo projectId');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Android channel setup
    const { Platform } = await import('react-native');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    return token;
  } catch (err) {
    // This will fire on web — swallow silently
    console.log('[Push] Push notifications not available in this environment:', err);
    return null;
  }
}