import * as Location from 'expo-location';

//  Function to get current time and date
export const getCurrentDateTime = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }); // removed weekday
    return { time, date };
};

// 📍 Function to fetch user location with permission handling
export const fetchUserLocation = async (): Promise<string> => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return 'Location permission denied';
        }
        const loc = await Location.getCurrentPositionAsync({});
        const geo = await Location.reverseGeocodeAsync(loc.coords);
        if (geo.length > 0) {
            const { city, country } = geo[0];
            return `${city || 'Unknown City'}, ${country || 'Unknown Country'}`;
        } else {
            return 'Location not found';
        }
    } catch (error) {
        console.log('Location error:', error);
        return 'Unable to fetch location';
    }
};
