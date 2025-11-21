import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Image, TextInput, Alert, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

(Ionicons as any)?.loadFont?.();

export default function PersonalInfoScreen({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: 'John Doe',
    position: 'Senior Engineer',
    employeeId: 'EMP-0001',
    role: 'Full-time',
    department: 'Engineering',
    location: 'Dubai, UAE',
    joinDate: 'Jan 15, 2022',
    email: 'john.doe@example.com',
    phone: '+971 50 123 4567',
  });

  const onPickImage = async () => {
    if (!editing) return;
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
      if (res?.assets && res.assets[0]?.uri) {
        setAvatar(res.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Photo', 'Could not open gallery');
    }
  };

  const safeOpen = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('Open', 'No compatible app installed');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Open', 'Unable to open');
    }
  };
  const onCall = () => { if (form.phone) safeOpen(`tel:${form.phone}`); };
  const onEmail = () => { if (form.email) safeOpen(`mailto:${form.email}`); };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b1b" />
      {/* Modern hero header */}
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroTop}>
          <Pressable onPress={onBack} style={styles.headerBtn} accessibilityRole="button">
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Personal Info</Text>
          <View style={styles.headerActions}>
            {editing ? (
              <>
                <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.headerBtn}>
                  <Ionicons name="close" size={20} color="#fff" />
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => { setEditing(false); }} style={styles.headerBtn}>
                  <Ionicons name="checkmark" size={22} color="#22c55e" />
                </Pressable>
              </>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.headerBtn}>
                <Ionicons name="create-outline" size={20} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.profileRow}>
          <Pressable onPress={onPickImage} style={styles.avatarWrap} accessibilityRole="button">
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={26} color="#9ca3af" />
              </View>
            )}
            {editing && (
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Field label="Name" value={form.name} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, name: t }))} />
            <Field label="Position" value={form.position} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, position: t }))} />
            <Field label="Employee ID" value={form.employeeId} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, employeeId: t }))} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Details</Text>
          <RowEdit label="Role" value={form.role} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, role: t }))} />
          <RowEdit label="Department" value={form.department} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, department: t }))} />
          <RowEdit label="Location" value={form.location} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, location: t }))} />
          <RowEdit label="Join Date" value={form.joinDate} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, joinDate: t }))} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>
          <RowEdit label="Email" value={form.email} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, email: t }))} />
          <RowEdit label="Phone" value={form.phone} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))} />
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, editing, onChangeText }: { label: string; value: string; editing: boolean; onChangeText: (t: string) => void }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.smallLabel}>{label}</Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder={label}
          placeholderTextColor="#9ca3af"
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  );
}

function RowEdit({ label, value, editing, onChangeText }: { label: string; value: string; editing: boolean; onChangeText: (t: string) => void }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.itemLabel}>{label}</Text>
      {editing ? (
        <TextInput value={value} onChangeText={onChangeText} style={[styles.input, { flex: 1, marginLeft: 12 }]} placeholder={label} placeholderTextColor="#9ca3af" />
      ) : (
        <Text style={styles.itemValue}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  hero: { backgroundColor: '#0b0b1b', paddingBottom: 10, paddingHorizontal: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '700' },
  headerActions: { flexDirection: 'row' },
  content: { padding: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 12 },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#0b0b1b', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 12 },
  cardTitle: { color: '#111827', fontWeight: '700', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  itemLabel: { color: '#6b7280' },
  itemValue: { color: '#111827', fontWeight: '600', marginLeft: 12 },
  smallLabel: { color: '#6b7280', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 10 : 6, color: '#111827' },
});








