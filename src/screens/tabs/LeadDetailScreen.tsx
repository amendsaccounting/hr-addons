import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking, Platform, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLead, type Lead } from '../../services/leadService';

(Ionicons as any)?.loadFont?.();

export default function LeadDetailScreen({ name, onBack }: { name: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(true);
  const [lead, setLead] = React.useState<Lead | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const l = await getLead(name);
        if (mounted) setLead(l);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [name]);

  return (
    <View style={styles.screen}>
      {loading ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <LinearGradient colors={["#0b0b1b", "#1f243d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroCard, { paddingTop: insets.top + 12 }]}> 

            <View style={styles.heroTopRow}>
              <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtnDark}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <Text style={styles.heroTitle}>Lead Details</Text>
              <View style={{ width: 36 }} />
            </View>
            <View style={styles.heroInfoRow}>
              <View style={styles.avatarLg}>
                <Text style={styles.avatarLgText}>{(lead?.company_name || lead?.lead_name || 'L').slice(0,1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName} numberOfLines={1}>{lead?.company_name || lead?.lead_name || 'Lead'}</Text>
                {!!lead?.lead_name && <Text style={styles.heroSub} numberOfLines={1}>{lead?.lead_name}</Text>}
                <View style={styles.heroChips}>
                  {!!lead?.status && (
                    <View style={[styles.badge, { backgroundColor: '#e7f0ff' }]}>
                      <Text style={[styles.badgeText, { color: '#0b6dff' }]}>{lead.status}</Text>
                    </View>
                  )}
                  {!!lead?.source && (
                    <View style={[styles.badge, { backgroundColor: '#fff' }, styles.linkBadge]}>
                      <Text style={[styles.badgeText, { color: '#111827' }]}>{lead.source}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.quickActions}>
              <QuickAction icon="call" label="Call" onPress={() => callNumber(lead?.mobile_no || lead?.phone)} />
              <QuickAction icon="mail" label="Email" onPress={() => emailTo(lead?.email_id)} />
              <QuickAction icon="navigate" label="Map" onPress={() => openMap(lead?.address)} />
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={[styles.wrapper, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.card}>
            <InfoRow label="Email" value={lead?.email_id} icon="mail-outline" onPress={() => emailTo(lead?.email_id)} />
            <InfoRow label="Mobile" value={lead?.mobile_no} icon="call-outline" onPress={() => callNumber(lead?.mobile_no)} />
            <InfoRow label="Phone" value={lead?.phone} icon="call-outline" onPress={() => callNumber(lead?.phone)} />
          </View>

          <Text style={styles.sectionTitle}>Company</Text>
          <View style={styles.card}>
            <InfoRow label="Company Name" value={lead?.company_name} icon="business-outline" />
            <InfoRow label="Address" value={lead?.address} icon="home-outline" multiline onPress={() => openMap(lead?.address)} />
          </View>

          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <InfoRow label="Status" value={lead?.status} icon="bookmark-outline" />
            <InfoRow label="Source" value={lead?.source} icon="link-outline" />
            <InfoRow label="Territory" value={lead?.territory} icon="location-outline" />
            <InfoRow label="Lead Name" value={lead?.lead_name} icon="person-outline" />
            <InfoRow label="Lead ID" value={lead?.name} icon="id-card-outline" />
          </View>

          {!!lead?.notes && (
            <>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.card}>
                <Text style={styles.notesText}>{lead?.notes}</Text>
              </View>
            </>
          )}

          {(() => {
            if (!lead) return null;
            const shown = new Set<string>(['name','lead_name','company_name','email_id','mobile_no','phone','status','source','territory','address','notes']);
            const extras = Object.keys(lead)
              .filter(k => !shown.has(k) && !/^(__|_)*$/.test(k) && !['doctype','owner','creation','modified','modified_by','docstatus','idx'].includes(k))
              .filter(k => {
                const v: any = (lead as any)[k];
                return v !== null && v !== undefined && String(v).trim().length > 0;
              });
            if (extras.length === 0) return null;
            const toLabel = (s: string) => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
            return (
              <>
                <Text style={styles.sectionTitle}>Other Details</Text>
                <View style={styles.card}>
                  {extras.map((k, i) => (
                    <InfoRow key={k} label={toLabel(k)} value={String((lead as any)[k])} isLast={i === extras.length - 1} />
                  ))}
                </View>
              </>
            );
          })()}
        </ScrollView>
        </>
      )}
    </View>
  );
}

function InfoRow({ label, value, icon, multiline, isLast, onPress }: { label: string; value?: string | number | null; icon?: string; multiline?: boolean; isLast?: boolean; onPress?: () => void }) {
  if (!value && value !== 0) return null;
  const Inner = (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <View style={styles.infoLeft}>
        {!!icon && <Ionicons name={icon as any} size={14} color="#6b7280" style={{ width: 18, marginRight: 6 }} />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, multiline && { flex: 1 }]} numberOfLines={multiline ? 0 : 1}>{String(value)}</Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{Inner}</Pressable>;
  return Inner;
}

function callNumber(num?: string | null) {
  if (!num) return Alert.alert('Call', 'No phone number available');
  Linking.openURL(`tel:${String(num).trim()}`).catch(() => Alert.alert('Call', 'Unable to open dialer'));
}
function emailTo(addr?: string | null) {
  if (!addr) return Alert.alert('Email', 'No email address available');
  Linking.openURL(`mailto:${String(addr).trim()}`).catch(() => Alert.alert('Email', 'Unable to open mail app'));
}
function openMap(address?: string | null) {
  if (!address) return Alert.alert('Map', 'No address available');
  const q = encodeURIComponent(address);
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickBtn}>
      <Ionicons name={`${icon}-outline` as any} size={16} color="#fff" />
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  wrapper: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 0 },
  heroCard: { borderRadius: 0, paddingHorizontal: 12, paddingVertical: 12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtnDark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  heroInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  avatarLg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarLgText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  heroName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroSub: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  heroChips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 0, backgroundColor: 'rgba(255,255,255,0.18)' },
  quickLabel: { color: '#fff', fontWeight: '700', fontSize: 12 },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  sectionTitle: { marginTop: 12, marginBottom: 6, marginLeft: 2, fontSize: 12, fontWeight: '700', color: '#111827' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  infoRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eef0f3' },
  infoLeft: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { color: '#6b7280', fontSize: 12 },
  infoValue: { color: '#111827', fontSize: 13, marginLeft: 10, maxWidth: '60%', textAlign: 'right' },
  notesText: { fontSize: 12, color: '#4b5563' },
});
