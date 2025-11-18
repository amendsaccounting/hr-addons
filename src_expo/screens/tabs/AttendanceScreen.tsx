import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, Dimensions } from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE } from '@env';
import axios from 'axios';

const { width } = Dimensions.get('window');

const AttendanceScreen = () => {
  const navigation = useNavigation();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [location, setLocation] = useState('Getting your location...');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const latest = recentHistory && recentHistory.length > 0 ? recentHistory[0] : null;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(formattedTime);
      setCurrentDate(now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [id, data] = await AsyncStorage.multiGet(['employeeId', 'employeeData']).then(rows => [rows.find(r=>r[0]==='employeeId')?.[1], rows.find(r=>r[0]==='employeeData')?.[1]]);
        if (id) {
          setEmployeeId(id);
        } else if (data) {
          try { setEmployeeId(JSON.parse(data)?.name || null); } catch {}
        }
      } catch {}
      await loadRecentHistory();
    })();
  }, []);

  const formatTime12 = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const hh = ((h % 12) || 12).toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${hh}:${mm} ${ap}`;
  };

  const loadRecentHistory = async () => {
    try {
      // Prefer explicit employeeId key, then fallback to employeeData.name
      let id: string | null = employeeId;
      if (!id) {
        const [rawId, rawData] = await AsyncStorage.multiGet(['employeeId', 'employeeData']).then(rows => [rows.find(r=>r[0]==='employeeId')?.[1], rows.find(r=>r[0]==='employeeData')?.[1]]);
        id = rawId || (rawData ? (()=>{ try { return JSON.parse(rawData as string)?.name || null; } catch { return null; } })() : null);
      }
      if (!id) return;

      const params: any = {
        filters: JSON.stringify([["employee", "=", id]]),
        fields: JSON.stringify(["name","employee","log_type","time","location"]),
        order_by: 'time asc',
        limit_page_length: '200',
      };
      const listRes = await axios.get(`${ERP_URL_RESOURCE}/${encodeURIComponent('Employee Checkin')}` , {
        params,
        headers: { Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}` },
      });
      const rows: any[] = listRes?.data?.data || [];
      const items = rows.map(r => ({ ...r, dt: new Date(r.time) })).sort((a,b)=>a.dt.getTime()-b.dt.getTime());
      const out: any[] = [];
      let open: any | null = null;
      for (const it of items) {
        const lt = String(it.log_type).toUpperCase();
        if (lt === 'IN') {
          if (open) {
            out.push({ id: `${open.name}-open`, date: open.dt.toLocaleDateString(), clockIn: formatTime12(open.dt), clockOut: '', locationIn: open.location || '', locationOut: '' });
          }
          open = it;
        } else if (lt === 'OUT') {
          if (open && it.dt.getTime() > open.dt.getTime()) {
            out.push({
              id: `${open.name}-${it.name}`,
              date: it.dt.toLocaleDateString(),
              clockIn: formatTime12(open.dt),
              clockOut: formatTime12(it.dt),
              locationIn: open.location || '',
              locationOut: it.location || '',
            });
            open = null;
          } else {
            out.push({ id: `${it.name}`, date: it.dt.toLocaleDateString(), clockIn: '', clockOut: formatTime12(it.dt), locationIn: '', locationOut: it.location || '' });
          }
        }
      }
      if (open) {
        out.push({ id: `${open.name}-open`, date: open.dt.toLocaleDateString(), clockIn: formatTime12(open.dt), clockOut: '', locationIn: open.location || '', locationOut: '' });
      }
      // Built in ascending order; show latest first
      const desc = out.slice().reverse();
      const finalList = desc.slice(0, 10);
      setRecentHistory(finalList);
      try { console.log('Expo Attendance history', { employeeId: id, count: finalList.length }); } catch {}
      // Reflect current session in UI
      if (out.length > 0) {
        const latest = out[0];
        setIsClockedIn(!!latest.clockIn && !latest.clockOut);
      }
    } catch (e) {
      // Silent fail; keep whatever is shown
    }
  };

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
        address = `${place.name || ''} ${place.street || ''}, ${place.city || ''}`;
      }
      return `${address || 'Unknown location'}`;
    } catch (err) {
      console.log('Location Error:', err);
      Alert.alert('Error', 'Unable to fetch location. Please ensure GPS is on.');
      return 'Location unavailable';
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        // Clock IN
        const response = await axios.post(
          `${ERP_URL_RESOURCE}/${encodeURIComponent('Employee Checkin')}`,
          {
            employee: employeeId || employee.name,
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
        await loadRecentHistory();
        setIsClockedIn(true);
        Alert.alert('Success', 'You have clocked in successfully!');
      } else {
        // Clock OUT
        const response = await axios.post(
          `${ERP_URL_RESOURCE}/${encodeURIComponent('Employee Checkin')}`,
          {
            employee: employeeId || employee.name,
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

        await loadRecentHistory();
        setIsClockedIn(false);
        Alert.alert('Success', 'You have clocked out successfully!');
      }
    } catch (error: any) {
      console.error('Employee Checkin Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to record attendance. Please try again.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const renderHistoryItem = ({ item, index }: any) => {
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
    const totalHours = item.clockOut ? 
      ((end.hours + end.minutes / 60) - (start.hours + start.minutes / 60)).toFixed(2) : '--';

    return (
      <View style={[
        styles.historyItem,
        index === 0 && styles.currentSessionItem
      ]}>
        <View style={styles.historyLeft}>
          <View style={styles.dateRow}>
            <Ionicons 
              name="calendar-outline" 
              size={16} 
              color={index === 0 ? "#fff" : "#666"} 
            />
            <Text style={[
              styles.historyDate,
              index === 0 && styles.currentSessionText
            ]}>
              {item.date}
            </Text>
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Ionicons 
                name="enter-outline" 
                size={14} 
                color={index === 0 ? "#fff" : "#000"} 
              />
              <Text style={[
                styles.historyTime,
                index === 0 && styles.currentSessionText
              ]}>
                {item.clockIn}
              </Text>
            </View>
            {item.clockOut && (
              <View style={styles.timeBlock}>
                <Ionicons 
                  name="exit-outline" 
                  size={14} 
                  color={index === 0 ? "#fff" : "#000"} 
                />
                <Text style={[
                  styles.historyTime,
                  index === 0 && styles.currentSessionText
                ]}>
                  {item.clockOut}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.historyRight}>
          <View style={[
            styles.hoursBadge,
            index === 0 && styles.currentSessionHours
          ]}>
            <Text style={[
              styles.historyTotal,
              index === 0 && styles.currentSessionText
            ]}>
              {totalHours} hrs
            </Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={index === 0 ? "#fff" : "#666"} />
            <Text style={[styles.locationText, index === 0 && styles.currentSessionText]} numberOfLines={1}>
              In: {item.locationIn || '-'}
            </Text>
          </View>
          <View style={[styles.locationRow, { marginTop: 2 }]}>
            <Ionicons name="location-outline" size={12} color={index === 0 ? "#fff" : "#666"} />
            <Text style={[styles.locationText, index === 0 && styles.currentSessionText]} numberOfLines={1}>
              Out: {item.locationOut || '-'}
            </Text>
          </View>
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
        backgroundColor="#000"
      />
      
      <View style={styles.wrapper}>
        {/* Main Clock Card */}
        <View style={styles.clockCard}>
          <View style={styles.clockHeader}>
            <Ionicons 
              name="time-outline" 
              size={28} 
              color="#000" 
            />
            <Text style={styles.clockTitle}>Current Time</Text>
          </View>
          
          <Text style={styles.timeText}>{currentTime || '--:--'}</Text>
          <Text style={styles.dateText}>{currentDate}</Text>

          {/* Location Section */}
          <View style={styles.locationSection}>
            <Ionicons name="location-outline" size={16} color="#666" />
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#666" style={styles.loadingIndicator} />
            ) : (
              <Text style={styles.locationText} numberOfLines={2}>
                {location}
              </Text>
            )}
          </View>

          {/* Clock Button */}
          <TouchableOpacity 
            style={[
              styles.clockButton,
              isClockedIn ? styles.clockOutButton : styles.clockInButton
            ]} 
            onPress={handleClock}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons 
                  name={isClockedIn ? "log-out-outline" : "log-in-outline"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.buttonText}>
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Status Indicator */}
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              isClockedIn ? styles.statusActive : styles.statusInactive
            ]} />
            <Text style={styles.statusText}>
              {isClockedIn ? 'Currently Clocked In' : 'Ready to Clock In'}
            </Text>
          </View>
        </View>

        {/* Recent History Section */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent History</Text>
            <Ionicons name="time-outline" size={20} color="#666" />
          </View>
          
          <FlatList
            data={recentHistory}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={60} color="#ccc" />
                <Text style={styles.emptyTitle}>No attendance records</Text>
                <Text style={styles.emptySubtitle}>
                  Your attendance history will appear here
                </Text>
              </View>
            }
          />
        </View>

        {/* Per-row details are shown inline in each history item */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  wrapper: {
    flex: 1,
    padding: 16,
  },
  clockCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  clockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clockInButton: {
    backgroundColor: '#000',
  },
  clockOutButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#000',
  },
  statusInactive: {
    backgroundColor: '#999',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  historySection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  currentSessionItem: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  historyLeft: {
    flex: 1,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  hoursBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currentSessionHours: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  historyTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currentSessionText: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
});

export default AttendanceScreen;
