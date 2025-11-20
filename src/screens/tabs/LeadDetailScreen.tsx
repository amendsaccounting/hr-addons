import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, StatusBar, ActivityIndicator, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getLead, type Lead as ERPLead } from '../../services/leadService';

(Ionicons as any)?.loadFont?.();

// Static-only screen matching the provided screenshot
export default function LeadDetailScreen({ name, onBack }: { name: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'Details' | 'Notes' | 'Activity'>('Details');
  const [editing, setEditing] = useState(false);
  const [lead, setLead] = useState<ERPLead | any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    phone: '',
    mobile: '',
    website: '',
    source: '',
    dateAdded: '',
    assignedTo: '',
    location: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const row = await getLead(name);
        if (!cancelled) {
          setLead(row as any);
          setForm({
            phone: (row as any)?.phone || '',
            mobile: (row as any)?.mobile_no || '',
            website: (row as any)?.website || '',
            source: (row as any)?.source || '',
            dateAdded: (row as any)?.custom_date || '',
            assignedTo: (row as any)?.lead_owner || '',
            location: (row as any)?.country || '',
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load lead');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [name]);

  const safeOpen = async (url: string, label: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) return Alert.alert(label, 'No compatible app to handle this action.');
      await Linking.openURL(url);
    } catch {
      Alert.alert(label, 'Unable to open.');
    }
  };

  const getPrimaryPhone = () => {
    const raw = (lead as any)?.mobile_no || (lead as any)?.phone || form.mobile || form.phone;
    if (!raw) return '';
    return String(raw).replace(/[^\d+]/g, '');
  };

  const onCall = () => {
    const phone = getPrimaryPhone();
    if (!phone) return Alert.alert('Call', 'No phone number');
    safeOpen(`tel:${phone}`, 'Call');
  };

  const onMessage = () => {
    const phone = getPrimaryPhone();
    if (!phone) return Alert.alert('Message', 'No phone number');
    safeOpen(`sms:${phone}`, 'Message');
  };

  const onWebsite = () => {
    const url = (lead as any)?.website || form.website;
    if (!url) return Alert.alert('Website', 'No website');
    const u = url.startsWith('http') ? url : `https://${url}`;
    safeOpen(u, 'Website');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <LeadHeroHeader
        onBack={onBack}
        insetsTop={insets.top}
        editing={editing}
        onEdit={() => setEditing(true)}
        onCancel={() => setEditing(false)}
        onSave={() => setEditing(false)}
        lead={lead as any}
      />

      {/* Fixed actions bar */}
      <View style={styles.actionsWrap}>
        <View style={styles.actionsRow}>
          <ActionButton label="Call" icon="call" primary onPress={onCall} />
          <ActionButton label="Message" icon="chatbubble" onPress={onMessage} />
          <ActionButton label="Website" icon="globe-outline" onPress={onWebsite} />
        </View>
      </View>

      {/* Fixed tabs bar */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          {(['Details', 'Notes', 'Activity'] as const).map(t => {
            const active = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={styles.tabItem}> 
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
                {active && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Cards (Details only) */}
        {tab === 'Details' && (
          <>
            {loading ? (
              <View style={styles.loadingCard}><ActivityIndicator size="large" /></View>
            ) : error ? (
              <View style={styles.loadingCard}>
                <Text style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text>
                <Pressable onPress={() => {
                  setLoading(true); setError(null);
                  getLead(name).then((row)=>{ setLead(row as any); }).catch((e)=> setError(e?.message||'Failed to load lead')).finally(()=> setLoading(false));
                }} style={[styles.actionBtn, styles.actionBtnPrimary, { alignSelf: 'flex-start', paddingHorizontal: 14 }]}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            <Card>
              <CardTitle>Contact Information</CardTitle>
              <EditableField label="Mobile Number" value={form.mobile || (lead as any)?.mobile_no || '-'} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, mobile: t }))} />
              <Divider />
              <EditableField label="Phone Number" value={form.phone || (lead as any)?.phone || '-'} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))} />
              <Divider />
              <EditableField label="Website" value={form.website || (lead as any)?.website || '-'} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, website: t }))} />
            </Card>

            <Card>
              <CardTitle>Lead Details</CardTitle>
              <EditableField label="Lead Name" value={(lead as any)?.lead_name || '-'} editing={false} />
              <Divider />
              <EditableField label="Salutation" value={(lead as any)?.salutation || '-'} editing={false} />
              <Divider />
              <EditableField label="First Name" value={(lead as any)?.first_name || '-'} editing={false} />
              <Divider />
              <EditableField label="Status" value={(lead as any)?.status || '-'} editing={false} />
              <Divider />
              <EditableField label="Lead Source" value={(lead as any)?.source || '-'} editing={false} />
              <Divider />
              <EditableField label="Qualification Status" value={(lead as any)?.qualification_status || '-'} editing={false} />
              <Divider />
              <EditableField label="Lead Owner" value={(lead as any)?.lead_owner || '-'} editing={false} />
              <Divider />
              <EditableField label="Territory" value={(lead as any)?.territory || '-'} editing={false} />
              <Divider />
              <EditableField label="Company Name" value={(lead as any)?.company_name || '-'} editing={false} />
              <Divider />
              <EditableField label="Company" value={(lead as any)?.company || '-'} editing={false} />
              <Divider />
              <EditableField label="Title" value={(lead as any)?.title || '-'} editing={false} />
              <Divider />
              <EditableField label="Country" value={(lead as any)?.country || '-'} editing={false} />
              <Divider />
              <EditableField label="Location" value={(lead as any)?.custom_building__location || '-'} editing={false} />
              <Divider />
              <EditableField label="Language" value={(lead as any)?.language || '-'} editing={false} />
              <Divider />
              <EditableField label="Request Type" value={(lead as any)?.request_type || '-'} editing={false} />
              <Divider />
              <EditableField label="Type" value={(lead as any)?.type || '-'} editing={false} />
              <Divider />
              <EditableField label="No. of Employees" value={(lead as any)?.no_of_employees || '-'} editing={false} />
              <Divider />
              <EditableField label="Website" value={(lead as any)?.website || '-'} editing={false} />
            </Card>

            <Card>
              <CardTitle>System Info</CardTitle>
              <EditableField label="Name" value={(lead as any)?.name || '-'} editing={false} />
              <Divider />
              <EditableField label="Naming Series" value={(lead as any)?.naming_series || '-'} editing={false} />
              <Divider />
              <EditableField label="Custom Date" value={(lead as any)?.custom_date || '-'} editing={false} />
              <Divider />
              <EditableField label="Owner" value={(lead as any)?.owner || '-'} editing={false} />
              <Divider />
              <EditableField label="Creation" value={(lead as any)?.creation || '-'} editing={false} />
              <Divider />
              <EditableField label="Modified" value={(lead as any)?.modified || '-'} editing={false} />
              <Divider />
              <EditableField label="Modified By" value={(lead as any)?.modified_by || '-'} editing={false} />
              <Divider />
              <EditableField label="DocType" value={(lead as any)?.doctype || '-'} editing={false} />
              <Divider />
              <EditableField label="DocStatus" value={String((lead as any)?.docstatus ?? '') || '-'} editing={false} />
              <Divider />
              <EditableField label="Index" value={String((lead as any)?.idx ?? '') || '-'} editing={false} />
              <Divider />
              <EditableField label="Disabled" value={String((lead as any)?.disabled ?? '') || '-'} editing={false} />
              <Divider />
              <EditableField label="Blog Subscriber" value={String((lead as any)?.blog_subscriber ?? '') || '-'} editing={false} />
              <Divider />
              <EditableField label="Unsubscribed" value={String((lead as any)?.unsubscribed ?? '') || '-'} editing={false} />
              <Divider />
              <EditableField label="Annual Revenue" value={String((lead as any)?.annual_revenue ?? '') || '-'} editing={false} />
            </Card>

            <Card>
              <CardTitle>Notes / Follow-up</CardTitle>
              <EditableField label="Follow Up" value={(lead as any)?.custom_follow_up_details || '-'} editing={false} />
            </Card>
          </>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable style={[styles.fab, { bottom: 24 + insets.bottom }]}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

function LeadHeroHeader({ onBack, insetsTop, editing, onEdit, onCancel, onSave, lead }: { onBack?: () => void; insetsTop: number; editing?: boolean; onEdit?: () => void; onCancel?: () => void; onSave?: () => void; lead?: any }) {
  return (
    <View style={styles.heroWrap}>
      <View style={[styles.heroTop, { paddingTop: insetsTop + 10 }]}>        
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </Pressable>
        <Text style={styles.heroTopTitle}>Lead Details</Text>
        {editing ? (
          <View style={{ flexDirection: 'row' }}>
            <Pressable hitSlop={10} style={styles.iconBtn} onPress={onCancel}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </Pressable>
            <Pressable hitSlop={10} style={styles.iconBtn} onPress={onSave}>
              <Ionicons name="checkmark" size={22} color="#22c55e" />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row' }}>
            <Pressable hitSlop={10} style={styles.iconBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={20} color="#ffffff" />
            </Pressable>
            <Pressable hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="ellipsis-vertical" size={18} color="#ffffff" />
            </Pressable>
          </View>
        )}
      </View>
      <View style={styles.heroCard}>
        <View style={styles.avatarLg}>
          <Ionicons name="person" color="#ffffff" size={28} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{(lead?.lead_name || lead?.first_name || lead?.name || 'Lead') as string}</Text>
          <Text style={styles.role}>{[lead?.company_name, lead?.country].filter(Boolean).join(' • ')}</Text>
          <View style={{ marginTop: 8 }}>
            <View style={styles.statusChip}><Text style={styles.statusChipText}>{(lead?.status || '-') as string}</Text></View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* UI Helpers */

function ActionButton({ label, icon, primary, onPress }: { label: string; icon: string; primary?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, primary ? styles.actionBtnPrimary : styles.actionBtnGhost]}>
      <Ionicons name={icon as any} size={16} color={primary ? '#ffffff' : '#111827'} />
      <Text style={[styles.actionBtnText, primary ? { color: '#fff' } : { color: '#111827' }]}>{label}</Text>
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

function EditableField({ label, value, editing, onChangeText }: { label: string; value: string; editing?: boolean; onChangeText?: (t: string) => void }) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          style={styles.input}
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

/* Styles */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { backgroundColor: '#ffffff' },
  heroTop: { backgroundColor: '#111827', paddingHorizontal: 12, paddingBottom: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTopTitle: { color: '#ffffff', fontWeight: '700' },
  heroCard: { marginHorizontal: 12, marginTop: -28, backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  avatarLg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  role: { marginTop: 4, color: '#6B7280', lineHeight: 18 },
  statusChip: { alignSelf: 'flex-start', backgroundColor: '#E0F2FE', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  statusChipText: { color: '#0369A1', fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1, backgroundColor: '#ffffff' },
  actionsWrap: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  actionBtnPrimary: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  actionBtnGhost: { backgroundColor: '#ffffff' },
  actionBtnText: { fontWeight: '600' },

  tabsWrap: { backgroundColor: '#ffffff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#111827' },
  tabUnderline: { marginTop: 6, height: 2, width: 56, backgroundColor: '#2563EB', borderRadius: 2 },

  card: { backgroundColor: '#ffffff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  fieldValue: { color: '#111827' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, color: '#111827', backgroundColor: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#EFF2F5', marginVertical: 4 },

  fab: { position: 'absolute', right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', elevation: 3 },
});




