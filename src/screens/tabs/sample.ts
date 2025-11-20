import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking, Platform, Alert, SectionList, Modal, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLead, updateLead, prepareLeadPayload, type Lead } from '../../services/leadService';

(Ionicons as any)?.loadFont?.();

export default function LeadDetailScreen({ name, onBack }: { name: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(true);
  const [lead, setLead] = React.useState<Lead | null>(null);
  const [editVisible, setEditVisible] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    lead_name: '',
    company_name: '',
    email_id: '',
    mobile_no: '',
    phone: '',
    status: '',
    source: '',
    territory: '',
    notes: '',
  });

  console.log("lead=====>",lead);
  

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
              <Pressable accessibilityRole="button" onPress={() => {
                setForm({
                  lead_name: String(lead?.lead_name || ''),
                  company_name: String(lead?.company_name || ''),
                  email_id: String(lead?.email_id || ''),
                  mobile_no: String(lead?.mobile_no || ''),
                  phone: String(lead?.phone || ''),
                  status: String(lead?.status || ''),
                  source: String(lead?.source || ''),
                  territory: String(lead?.territory || ''),
                  notes: String((lead as any)?.notes || ''),
                });
                setEditVisible(true);
              }} style={styles.editBtn}>
                <Ionicons name="create-outline" size={18} color="#fff" />
              </Pressable>
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
          {(() => {
            type RowDef = { label: string; value?: any; icon?: string; multiline?: boolean; onPress?: () => void };
            type CardItem = { kind: 'rows'; rows: RowDef[] } | { kind: 'notes'; text: string };
            type CardSection = { title: string; data: CardItem[] };

            const sections: CardSection[] = [];
            const contactRows: RowDef[] = [
              { label: 'Email', value: lead?.email_id, icon: 'mail-outline', onPress: () => emailTo(lead?.email_id) },
              { label: 'Mobile', value: lead?.mobile_no, icon: 'call-outline', onPress: () => callNumber(lead?.mobile_no) },
              { label: 'Phone', value: lead?.phone, icon: 'call-outline', onPress: () => callNumber(lead?.phone) },
            ].filter(r => r.value);
            if (contactRows.length) sections.push({ title: 'Contact', data: [{ kind: 'rows', rows: contactRows }] });

            const companyRows: RowDef[] = [
              { label: 'Company Name', value: lead?.company_name, icon: 'business-outline' },
              { label: 'Address', value: lead?.address, icon: 'home-outline', multiline: true, onPress: () => openMap(lead?.address) },
            ].filter(r => r.value);
            if (companyRows.length) sections.push({ title: 'Company', data: [{ kind: 'rows', rows: companyRows }] });

            const detailRows: RowDef[] = [
              { label: 'Status', value: lead?.status, icon: 'bookmark-outline' },
              { label: 'Source', value: lead?.source, icon: 'link-outline' },
              { label: 'Territory', value: lead?.territory, icon: 'location-outline' },
              { label: 'Lead Name', value: lead?.lead_name, icon: 'person-outline' },
              { label: 'Lead ID', value: lead?.name, icon: 'id-card-outline' },
            ].filter(r => r.value);
            if (detailRows.length) sections.push({ title: 'Details', data: [{ kind: 'rows', rows: detailRows }] });

            if (lead?.notes) sections.push({ title: 'Notes', data: [{ kind: 'notes', text: String(lead.notes) }] });

            const shown = new Set<string>(['name','lead_name','company_name','email_id','mobile_no','phone','status','source','territory','address','notes']);
            const extrasKeys = Object.keys(lead || {})
              .filter(k => !shown.has(k) && !/^(__|_)/.test(k) && !['doctype','owner','creation','modified','modified_by','docstatus','idx'].includes(k))
              .filter(k => { const v: any = (lead as any)[k]; return v !== null && v !== undefined && String(v).trim().length > 0; });
            if (extrasKeys.length) {
              const toLabel = (s: string) => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
              const rows: RowDef[] = extrasKeys.map(k => ({ label: toLabel(k), value: String((lead as any)[k]) }));
              sections.push({ title: 'Other Details', data: [{ kind: 'rows', rows }] });
            }

            return (
              <SectionList
                sections={sections}
                keyExtractor={(item, index) => `${(item as any).kind}-${index}`}
                renderSectionHeader={({ section }) => (
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                )}
                renderItem={({ item }) => (
                  item.kind === 'rows' ? (
                    <View style={styles.card}>
                      {item.rows.map((r, i) => (
                        <InfoRow key={`${r.label}-${i}`} label={r.label} value={r.value} icon={r.icon as any} multiline={r.multiline} isLast={i === item.rows.length - 1} onPress={r.onPress} />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.card}><Text style={styles.notesText}>{item.text}</Text></View>
                  )
                )}
                contentContainerStyle={[styles.wrapper, { paddingBottom: insets.bottom + 24 }]}
                initialNumToRender={3}
                windowSize={10}
                removeClippedSubviews
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            );
          })()}
        </ScrollView>
        {/* Edit Modal */}
        <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdrop}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={insets.top + 12}
                style={styles.modalWrap}
              >
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderText}>
                      <Text style={styles.modalTitle}>Edit Lead</Text>
                      <Text style={styles.modalSubtitle}>Update lead details and contact</Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setEditVisible(false)}>
                      <Ionicons name="close" size={20} color="#111827" />
                    </Pressable>
                  </View>
                  <ScrollView
                    style={styles.modalBodyScroll}
                    contentContainerStyle={styles.modalBody}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.sectionTitle}>Lead Details</Text>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      placeholder="e.g. John Smith"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      value={form.lead_name}
                      onChangeText={(v) => setForm({ ...form, lead_name: v })}
                    />
                    <Text style={styles.inputLabel}>Company Name</Text>
                    <TextInput
                      placeholder="e.g. Acme Inc."
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      value={form.company_name}
                      onChangeText={(v) => setForm({ ...form, company_name: v })}
                    />
                    <Text style={styles.inputLabel}>Status</Text>
                    <TextInput
                      placeholder="Lead / Open / Replied ..."
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      value={form.status}
                      onChangeText={(v) => setForm({ ...form, status: v })}
                    />
                    <Text style={styles.inputLabel}>Source</Text>
                    <TextInput
                      placeholder="e.g. Website"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      value={form.source}
                      onChangeText={(v) => setForm({ ...form, source: v })}
                    />
                    <Text style={styles.inputLabel}>Territory</Text>
                    <TextInput
                      placeholder="e.g. UAE"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      value={form.territory}
                      onChangeText={(v) => setForm({ ...form, territory: v })}
                    />

                    <Text style={styles.sectionTitle}>Contact</Text>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      placeholder="e.g. john@example.com"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.email_id}
                      onChangeText={(v) => setForm({ ...form, email_id: v })}
                    />
                    <Text style={styles.inputLabel}>Mobile</Text>
                    <TextInput
                      placeholder="e.g. 0501234567"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      keyboardType="phone-pad"
                      value={form.mobile_no}
                      onChangeText={(v) => setForm({ ...form, mobile_no: v })}
                    />
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      placeholder="e.g. 042345678"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                      keyboardType="phone-pad"
                      value={form.phone}
                      onChangeText={(v) => setForm({ ...form, phone: v })}
                    />

                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput
                      placeholder="Notes"
                      placeholderTextColor="#9ca3af"
                      style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                      multiline
                      value={form.notes}
                      onChangeText={(v) => setForm({ ...form, notes: v })}
                    />
                  </ScrollView>
                  <View style={styles.modalFooter}>
                    <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setEditVisible(false)}>
                      <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnPrimary]}
                      onPress={async () => {
                        if (!lead?.name) return;
                        try {
                          setSaving(true);
                          const base = prepareLeadPayload({
                            lead_name: form.lead_name,
                            company_name: form.company_name,
                            email_id: form.email_id,
                            mobile_no: form.mobile_no,
                            status: form.status as any,
                            source: form.source,
                            territory: form.territory,
                            notes: form.notes,
                          } as any);
                          const payload: any = { ...base };
                          if (form.phone) payload.phone = form.phone;
                          const updated = await updateLead(lead.name, payload);
                          if (!updated) throw new Error('Unable to update lead');
                          setLead(updated);
                          setEditVisible(false);
                        } catch (e: any) {
                          Alert.alert('Edit Lead', e?.message || 'Failed to save changes');
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Save Changes</Text>}
                    </Pressable>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  editBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
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
  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', alignItems: 'stretch' },
  modalWrap: { width: '100%', alignItems: 'stretch', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden', width: '100%', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
  modalHeader: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  modalTitle: { color: '#111827', fontWeight: '700' },
  modalSubtitle: { color: '#6b7280', marginTop: 4, fontSize: 12 },
  modalHeaderText: { flex: 1 },
  modalBodyScroll: { maxHeight: 520 },
  modalBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  inputLabel: { color: '#6b7280', fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827', backgroundColor: '#fff', marginBottom: 10 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modalBtnSecondary: { backgroundColor: '#f3f4f6' },
  modalBtnPrimary: { backgroundColor: '#0b0b1b' },
  modalBtnText: { color: '#fff', fontWeight: '700' },
  modalBtnTextSecondary: { color: '#111827' },
});
