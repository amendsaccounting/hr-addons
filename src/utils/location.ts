import { PermissionsAndroid, Platform } from 'react-native';

export const hasLocationPermission = async (): Promise<boolean> => {
  // On Android, use PermissionsAndroid to avoid Activity attachment issues
  if (Platform.OS === 'android') {
    try {
      const hasFineLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (hasFineLocation) return true;
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to check in.',
          buttonPositive: 'OK',
        }
      );
      return status === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      try { console.log('[location] android permission error', e); } catch {}
      return false;
    }
  }
  // On iOS, ask via RNLocation if available; otherwise allow and let system prompt on first call
  try {
    let RNLocation: any = null;
    try { RNLocation = require('react-native-location'); } catch {}
    if (RNLocation?.requestPermission) {
      const granted = await RNLocation.requestPermission({ ios: 'whenInUse' });
      try { console.log('[location] RNLocation.requestPermission (iOS) →', granted); } catch {}
      return !!granted;
    }
  } catch (e) {
    try { console.log('[location] iOS RNLocation.requestPermission error', e); } catch {}
  }
  return true;
};

export const getUserLocation = async (): Promise<any | null> => {
  const granted = await hasLocationPermission();
  if (!granted) {
    try { console.log('[location] Location permission denied'); } catch {}
    return null;
  }

  // Dynamically require to avoid Metro resolve error if package not installed
  let RNLocation: any = null;
  try { RNLocation = require('react-native-location'); } catch (e) {
    try { console.log('[location] react-native-location not installed', e?.message || e); } catch {}
    return null;
  }

  try {
    if (!RNLocation?.getLatestLocation) {
      try { console.log('[location] RNLocation native module unavailable'); } catch {}
      return null;
    }
    RNLocation.configure?.({ distanceFilter: 0 });
  } catch {}

  return await new Promise<any | null>(async (resolve) => {
    try {
      const latest = await RNLocation.getLatestLocation?.({ timeout: 15000 });
      if (latest && typeof latest.latitude === 'number' && typeof latest.longitude === 'number') {
        const position = { coords: { latitude: latest.latitude, longitude: latest.longitude, accuracy: latest.accuracy, speed: latest.speed, heading: latest.heading } };
        try { console.log('[location] LOCATION:', latest); } catch {}
        resolve(position);
        return;
      }
      // Avoid subscribe path to prevent startUpdatingLocation errors when native module not attached
      resolve(null);
    } catch (e) {
      try { console.log('[location] RNLocation error', e); } catch {}
      resolve(null);
    }
  });
};

// Alias that matches your provided sample; uses the same logic
export const requestLocationPermission = async (): Promise<boolean> => {
  return await hasLocationPermission();
};
