import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE } from '@env';
import axios from 'axios';

const AttendanceScreen = () => {
  const navigation = useNavigation();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [location, setLocation] = useState('Fetching location...');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

useEffect(() => {
  const interval = setInterval(() => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCurrentTime(formattedTime);
    setCurrentDate(now.toLocaleDateString());
  }, 1000);
  return () => clearInterval(interval);
}, []);


  useEffect(() => {
    (async () => {
      const savedHistory = await AsyncStorage.getItem('recentHistory');
      if (savedHistory) {
        setRecentHistory(JSON.parse(savedHistory));
      }
    })();
  }, []);

const fetchUserLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to clock in.');
      return 'Permission denied';
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      maximumAge: 10000,
      timeout: 15000,
    });
    const { latitude, longitude } = loc.coords;
    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    let address = '';
    if (reverseGeocode.length > 0) {
      const place = reverseGeocode[0];
      address = `${place.name || ''} ${place.street || ''}, ${place.city || ''}, ${place.region || ''}, ${place.country || ''}`;
    }
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${address || 'Unknown location'})`;
  } catch (err) {
    console.log('Location Error:', err);
    Alert.alert('Error', 'Unable to fetch location. Please ensure GPS is on.');
    return 'Location error';
  }
};

const getCurrentDateTime = () => {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // ⬅️ No seconds
  const date = now.toLocaleDateString();
  return { time, date };
};

  const handleClock = async () => {
    try {
      const employeeData = await AsyncStorage.getItem('employeeData');
      if (!employeeData) {
        Alert.alert('Error', 'Employee data not found. Please login again.');
        return;
      }
      const employee = JSON.parse(employeeData);

      setLoadingLocation(true);
      const loc = await fetchUserLocation();
      setLocation(loc);

      const now = new Date();
      const formattedTime = now.toISOString().slice(0, 19).replace('T', ' ');
      const { time, date } = getCurrentDateTime();

      if (!isClockedIn) {
        // ✅ CLOCK IN
        const response = await axios.post(
          `${ERP_URL_RESOURCE}/Employee Checkin`,
          {
            employee: employee.name,
            log_type: 'IN',
            time: formattedTime,
            device_id: 'MobileApp',
            location: loc,
          },
          {
            headers: {
              Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const newRecord = {
          id: Date.now().toString(),
          date,
          clockIn: time,
          clockOut: '',
          location: loc,
          checkinName: response.data.data.name,
        };

        const updatedHistory = [newRecord, ...(recentHistory || [])];
        setRecentHistory(updatedHistory);
        await AsyncStorage.setItem('recentHistory', JSON.stringify(updatedHistory)); // 💾 save

        setIsClockedIn(true);
        Alert.alert('Success', 'Clocked in successfully!');
      } else {
        const response = await axios.post(
          `${ERP_URL_RESOURCE}/Employee Checkin`,
          {
            employee: employee.name,
            log_type: 'OUT',
            time: formattedTime,
            device_id: 'MobileApp',
            location: loc,
          },
          {
            headers: {
              Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const updated = [...recentHistory];
        updated[0].clockOut = time;
        updated[0].location = loc;

        setRecentHistory(updated);
        await AsyncStorage.setItem('recentHistory', JSON.stringify(updated)); // 💾 save again
        setIsClockedIn(false);
        Alert.alert('Success', 'Clocked out successfully!');
      }
    } catch (error: any) {
      console.error('Employee Checkin Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to record checkin/checkout. Please try again.');
    } finally {
      setLoadingLocation(false);
    }
  };

  // 🧾 Render history items
  const renderHistoryItem = ({ item }: any) => {
    const parseTime = (time: string) => {
      if (!time) return { hours: 0, minutes: 0 };
      if (time.includes('AM') || time.includes('PM')) {
        const [h, mPart] = time.split(':');
        const m = mPart.slice(0, 2);
        const ampm = mPart.slice(3);
        let hours = parseInt(h, 10);
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return { hours, minutes: parseInt(m, 10) };
      } else {
        const [h, m] = time.split(':');
        return { hours: parseInt(h, 10), minutes: parseInt(m, 10) };
      }
    };

    const start = parseTime(item.clockIn);
    const end = parseTime(item.clockOut);
    const totalHours = ((end.hours + end.minutes / 60) - (start.hours + start.minutes / 60)).toFixed(2);

    return (
      <View style={styles.historyItem}>
        <View style={styles.historyLeft}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={20} color="#333" />
            <Text style={styles.historyDate}>{item.date}</Text>
          </View>
          <Text style={styles.historyClockIn}>In: {item.clockIn}</Text>
        </View>
        <View style={styles.historyRight}>
          <Text style={styles.historyTotal}>{totalHours} hrs</Text>
          <Text style={styles.historyClockOut}>Out: {item.clockOut}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Attendance"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightComponent={<Ionicons name="notifications-outline" size={24} color="#fff" />}
        backgroundColor="black"
      />
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Ionicons name="time-outline" size={30} color="black" style={styles.clockIcon} />
          <Text style={styles.timeText}>{currentTime || '--:--'}</Text>
          <Text style={styles.dateText}>{currentDate}</Text>

          {loadingLocation ? (
            <ActivityIndicator size="small" color="#666" style={{ marginVertical: 10 }} />
          ) : (
            <Text style={styles.locationText}>{location}</Text>
          )}

          <TouchableOpacity style={styles.clockButton} onPress={handleClock}>
            <Text style={styles.buttonText}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.statsTitle}>Recent History</Text>
        <FlatList
          data={recentHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          style={{ marginTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={80} color="#ccc" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>No attendance record found</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

export default AttendanceScreen;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f2f2',
    },
    wrapper: {
        flex: 1,
        padding: 16,
        backgroundColor: 'white'
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 5,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 6,
        alignItems: 'center',
    },
    timeText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#000',
    },
    clockIcon: {
        marginTop: 8,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 16,
        color: '#555',
        marginTop: 4,
    },
    locationText: {
        marginTop: 14,
        fontSize: 15,
        color: '#333',
        textAlign: 'center',
    },
    clockButton: {
        backgroundColor: 'black',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 20,
        paddingHorizontal: 15,
        marginTop: 0,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'left',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
    },
    statLabel: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginBottom: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    historyLeft: {
        flex: 1,
    },
    historyRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    historyDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginLeft: 6,
    },
    historyClockIn: {
        fontSize: 12,
        color: '#555',
        marginTop: 2,
    },
    historyTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: 'green',
    },
    historyClockOut: {
        fontSize: 12,
        color: '#555',
        marginTop: 2,
    },
    emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
},
emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
},

});
