import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  StatusBar,
  ScrollView,
  Linking,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { listLeads, type Lead as ERPLead } from '../../services/leadService';
import { launchImageLibrary, Asset } from 'react-native-image-picker';

(Ionicons as any)?.loadFont?.();

type Props = {
  onOpenLead?: (name: string, opts?: { edit?: boolean }) => void;
  onCreateLead?: () => void;
  refreshKey?: number;
};

type LeadItem = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: 'Open' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost' | string;
  source?: string;
  location?: string;
  value?: string;
  website?: string;
  added?: string;
};

const FILTERS: Array<'All' | 'New' | 'Contacted' | 'Qualified' | 'Prospect' | 'Converted' | 'Lost'> = [
  'All', 'New', 'Contacted', 'Qualified', 'Prospect', 'Converted', 'Lost'
];

export default function LeadScreen({ onOpenLead, onCreateLead, refreshKey }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');
  const [items, setItems] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE = 20;
  const [taskLead, setTaskLead] = useState<LeadItem | null>(null);
  const [eventLead, setEventLead] = useState<LeadItem | null>(null);
  

  // Debounce search input to reduce re-filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchText), 200);
    return () => clearTimeout(t);
  }, [searchText]);

  const data = items;

  const mapLead = (row: ERPLead): LeadItem => ({
    id: String(row.name || row.lead_name || ''),
    name: String(row.lead_name || row.name || ''),
    company: row.company_name || undefined,
    email: row.email_id || undefined,
    phone: (row.mobile_no as any) || (row.phone as any) || undefined,
    status: String((row.status as any) || ''),
    source: row.source || undefined,
    location: (row as any)?.custom_building__location || (row as any)?.territory || undefined,
    website: (row as any)?.website || undefined,
    added: (row as any)?.custom_date || (row as any)?.modified || (row as any)?.creation || undefined,
  });

  const load = useCallback(async (reset: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const offset = reset ? 0 : items.length;
      const rows = await listLeads({ search: query, status: filter, limit: PAGE, offset });
      const mapped = (rows || []).map(mapLead);
      const merged = reset ? mapped : [...items, ...mapped];
      const parseTs = (s: any) => {
        if (!s) return 0;
        const t = Date.parse(String(s).replace(' ', 'T'));
        return isNaN(t) ? 0 : t;
        };
      merged.sort((a, b) => parseTs(b.added) - parseTs(a.added));
      setItems(merged);
      setHasMore(mapped.length >= PAGE);
    } catch (e) {
      setHasMore(false);
    } finally {
      setLoading(false);
      if (reset) setRefreshing(false);
    }
  }, [items, query, filter, loading]);

  useEffect(() => {
    // initial and when query/filter or refresh key change
    setRefreshing(true);
    load(true);
  }, [query, filter, refreshKey]);

  const keyExtractor = useCallback((item: LeadItem) => item.id, []);

  const renderItem = useCallback(({ item }: { item: LeadItem }) => (
    <LeadCard
      item={item}
      onOpenLead={onOpenLead}
      onCreateTask={() => setTaskLead(item)}
      onCreateEvent={() => setEventLead(item)}
    />
  ), [onOpenLead]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b1b" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}> 
        <View style={styles.headerRow}>
          <Ionicons name="trending-up" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Sales Leads</Text>
        </View>
        <Text style={styles.headerSubtitle}>Track and manage sales opportunities</Text>

        {/* Stats inside header */}
        <View style={[styles.statsRow, { marginTop: 6 }]}> 
          <StatCard label="Total Leads" value="3" />
          <StatCard label="Pipeline Value" value="$150k" />
          <StatCard label="Won" value="$0k" />
        </View>
      </View>

      {/* Controls just below black background */}
      <View style={styles.topControls}>
        <View style={[styles.searchRow, { marginTop: 12 }]}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#6b7280" style={{ marginHorizontal: 8 }} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search leads"
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />
          </View>
          <Pressable style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add Lead" onPress={onCreateLead}>
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>
        <View style={[styles.filtersWrap, { marginTop: 10 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map(f => {
              const active = filter === f;
              return (
                <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityLabel={`Filter ${f}`}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={10}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        onEndReached={() => hasMore && !loading && load(false)}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(true); }}
        ListEmptyComponent={!loading ? (() => (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280' }}>No leads found</Text>
          </View>
        )) : undefined}
      />
      {/* Creation Modals */}
      <CreateTaskModal visible={!!taskLead} lead={taskLead} onClose={() => setTaskLead(null)} />
      <CreateEventModal visible={!!eventLead} lead={eventLead} onClose={() => setEventLead(null)} />
      
    </View>
  );
}

const Badge = React.memo(function Badge({ text, type }: { text: string; type?: 'status' | 'value' | 'neutral' }) {
  let bg = '#f3f4f6';
  let fg = '#374151';
  if (type === 'status') { bg = '#e0f2fe'; fg = '#075985'; }
  if (type === 'value') { bg = '#f1f5f9'; fg = '#111827'; }
  return (
    <View style={[styles.smallChip, { backgroundColor: bg }]}>
      {type === 'value' && <Text style={[styles.smallChipText, { marginRight: 2 }]}>$</Text>}
      <Text style={[styles.smallChipText, { color: fg }]}>{text}</Text>
    </View>
  );
});

const InfoLine = React.memo(function InfoLine({ icon, text, onPress }: { icon: string; text: string; onPress?: () => void }) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.infoLine} accessibilityRole={onPress ? 'button' : undefined} onPress={onPress}>
      <Ionicons name={icon as any} size={14} color="#6b7280" style={{ width: 18 }} />
      <Text style={onPress ? styles.infoLinkText : styles.infoText} numberOfLines={1}>{text}</Text>
    </Wrapper>
  );
});

const StatCard = React.memo(function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
});

type Attachment = { uri: string; name?: string; type?: string; fileSize?: number };

const LeadCard = React.memo(function LeadCard({ item, onOpenLead, onCreateTask, onCreateEvent }: { item: LeadItem; onOpenLead?: (name: string, opts?: { edit?: boolean }) => void; onCreateTask?: () => void; onCreateEvent?: () => void }) {
  const phone = String(item.phone || '').replace(/[^\d+]/g, '');
  const safeOpen = async (url: string, label?: string) => {
    try { await Linking.openURL(url); return; } catch {}
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) return Alert.alert(label || 'Action', 'No app available to handle this.');
      await Linking.openURL(url);
    } catch {
      Alert.alert(label || 'Action', 'Unable to open.');
    }
  };
  return (
    <Pressable
      style={styles.card}
      onPress={() => onOpenLead?.(item.name)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.companyTitle} numberOfLines={2} ellipsizeMode="tail">{item.company || '-'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit lead"
          style={styles.roundIcon}
          onPress={() => onOpenLead?.(item.name, { edit: true })}
        >
          <Ionicons name="create-outline" size={16} color="#fff" />
        </Pressable>
      </View>
      <Text style={styles.contactName}>{item.name}</Text>
      <View style={styles.badgesRow}>
        <Badge text={item.status || '—'} type="status" />
        {!!item.value && <Badge text={item.value} type="value" />}
        <Badge text="Website" type="neutral" />
      </View>
      {/* Action buttons */}
      <View style={styles.actionRow}>
        <ActionButton
          icon="call"
          label={item.phone || '—'}
          disabled={!phone}
          onPress={phone ? () => safeOpen(`tel:${phone}`, 'Call') : undefined}
        />
        <ActionButton
          icon="mail"
          label={item.email || '—'}
          disabled={!item.email}
          onPress={item.email ? () => safeOpen(`mailto:${item.email}`, 'Email') : undefined}
        />
      </View>

      {/* Tools: New Task / New Event */}
      <View style={styles.toolRow}>
        <ToolButton icon="list-outline" title="New Task" onPress={onCreateTask} />
        <ToolButton icon="calendar-outline" title="New Event" onPress={onCreateEvent} />
      </View>
      <Text style={styles.desc} numberOfLines={2}>Interested in enterprise package</Text>
      <InfoLine icon="location-outline" text={item.location || '—'} />
      <InfoLine icon="calendar-outline" text={`Added: ${item.added || '—'}`} />
    </Pressable>
  );
});

const ActionButton = React.memo(function ActionButton({ icon, label, onPress, disabled }: { icon: string; label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        disabled && styles.actionBtnDisabled,
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon as any} size={12} color={disabled ? '#9ca3af' : '#111827'} />
      <Text style={[styles.actionBtnText, disabled && styles.actionBtnTextDisabled]} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
    </Pressable>
  );
});

const ToolButton = React.memo(function ToolButton({ icon, title, onPress }: { icon: string; title: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.toolBtn, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon as any} size={12} color="#111827" />
      <Text style={styles.toolBtnText}>{title}</Text>
    </Pressable>
  );
});

// Simple creation modals — UI only for now
function CreateTaskModal({ visible, onClose, lead }: { visible: boolean; onClose: () => void; lead: LeadItem | null }) {
  const [title, setTitle] = useState<string>(lead ? `Follow up: ${lead.name}` : '');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [files, setFiles] = useState<Attachment[]>([]);

  useEffect(() => {
    if (visible) {
      setTitle(lead ? `Follow up: ${lead.name}` : '');
      setDueDate('');
      setNotes('');
      setFiles([]);
    }
  }, [visible, lead]);

  const onAddAttachment = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 });
      const asset: Asset | undefined = res?.assets?.[0];
      if (!asset?.uri) return;
      const next: Attachment = { uri: asset.uri, name: asset.fileName || 'attachment', type: asset.type || undefined, fileSize: asset.fileSize };
      setFiles((prev) => [...prev, next]);
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Task</Text>
            <Pressable onPress={onClose} accessibilityRole="button"><Ionicons name="close" size={20} color="#111827" /></Pressable>
          </View>
          <Text style={styles.modalHint} numberOfLines={1}>For: {lead?.name || '-'}</Text>
          <View style={styles.modalField}> 
            <Text style={styles.modalLabel}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Task title" style={styles.modalInput} />
          </View>
          <View style={styles.modalField}> 
            <Text style={styles.modalLabel}>Due Date</Text>
            <TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" style={styles.modalInput} />
          </View>
          <View style={styles.modalField}> 
            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" style={[styles.modalInput, { height: 72 }]} multiline />
          </View>
          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Attachments</Text>
            <View style={styles.attachRow}>
              {files.map((f, idx) => (
                <View key={`${f.uri}-${idx}`} style={styles.attachChip}>
                  <Ionicons name="attach" size={12} color="#111827" />
                  <Text style={styles.attachChipText} numberOfLines={1}>{f.name || `File ${idx+1}`}</Text>
                  <Pressable onPress={() => setFiles(files.filter((_, i) => i !== idx))} style={{ marginLeft: 6 }}>
                    <Ionicons name="close" size={12} color="#6b7280" />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={onAddAttachment} style={styles.attachAddBtn} accessibilityRole="button">
                <Ionicons name="add" size={12} color="#111827" />
                <Text style={styles.attachAddText}>Add</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={onClose}><Text style={styles.modalBtnGhostText}>Cancel</Text></Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={onClose}><Text style={styles.modalBtnPrimaryText}>Create</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CreateEventModal({ visible, onClose, lead }: { visible: boolean; onClose: () => void; lead: LeadItem | null }) {
  const [title, setTitle] = useState<string>(lead ? `Call: ${lead?.name}` : '');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [files, setFiles] = useState<Attachment[]>([]);

  useEffect(() => {
    if (visible) {
      setTitle(lead ? `Call: ${lead?.name}` : '');
      setDate('');
      setTime('');
      setLocation('');
      setNotes('');
      setFiles([]);
    }
  }, [visible, lead]);

  const onAddAttachment = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 });
      const asset: Asset | undefined = res?.assets?.[0];
      if (!asset?.uri) return;
      const next: Attachment = { uri: asset.uri, name: asset.fileName || 'attachment', type: asset.type || undefined, fileSize: asset.fileSize };
      setFiles((prev) => [...prev, next]);
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Event</Text>
            <Pressable onPress={onClose} accessibilityRole="button"><Ionicons name="close" size={20} color="#111827" /></Pressable>
          </View>
          <Text style={styles.modalHint} numberOfLines={1}>With: {lead?.name || '-'}</Text>
          <View style={styles.modalField}> 
            <Text style={styles.modalLabel}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Event title" style={styles.modalInput} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={[styles.modalField, { flex: 1, marginRight: 6 }]}> 
              <Text style={styles.modalLabel}>Date</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={styles.modalInput} />
            </View>
            <View style={[styles.modalField, { flex: 1, marginLeft: 6 }]}> 
              <Text style={styles.modalLabel}>Time</Text>
              <TextInput value={time} onChangeText={setTime} placeholder="HH:mm" style={styles.modalInput} />
            </View>
          </View>
          <View style={styles.modalField}> 
            <Text style={styles.modalLabel}>Location</Text>
            <TextInput value={location} onChangeText={setLocation} placeholder="Location (optional)" style={styles.modalInput} />
          </View>
          <View style={styles.modalField}> 
            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" style={[styles.modalInput, { height: 72 }]} multiline />
          </View>
          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Attachments</Text>
            <View style={styles.attachRow}>
              {files.map((f, idx) => (
                <View key={`${f.uri}-${idx}`} style={styles.attachChip}>
                  <Ionicons name="attach" size={12} color="#111827" />
                  <Text style={styles.attachChipText} numberOfLines={1}>{f.name || `File ${idx+1}`}</Text>
                  <Pressable onPress={() => setFiles(files.filter((_, i) => i !== idx))} style={{ marginLeft: 6 }}>
                    <Ionicons name="close" size={12} color="#6b7280" />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={onAddAttachment} style={styles.attachAddBtn} accessibilityRole="button">
                <Ionicons name="add" size={12} color="#111827" />
                <Text style={styles.attachAddText}>Add</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={onClose}><Text style={styles.modalBtnGhostText}>Cancel</Text></Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={onClose}><Text style={styles.modalBtnPrimaryText}>Create</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#0b0b1b', paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#cbd5e1', marginTop: 4, marginBottom: 10 },
  topControls: { paddingHorizontal: 16, paddingTop: 8 },
  statsRow: { flexDirection: 'row', marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  statLabel: { color: '#6b7280', fontSize: 11 },
  statValue: { color: '#111827', fontWeight: '700', marginTop: 6 },
  listContent: { paddingTop: 10, paddingBottom: 24 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, height: 40 },
  input: { flex: 1, color: '#111827', paddingRight: 10 },
  addBtn: { marginLeft: 10, width: 40, height: 40, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  filtersWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  filters: { paddingRight: 8, alignItems: 'center' },
  arrowBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, marginRight: 8 },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  sliderTrack: { height: 10, backgroundColor: '#f3f4f6', borderRadius: 8, marginTop: 8, marginHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  sliderThumb: { width: 60, height: 6, backgroundColor: '#9ca3af', borderRadius: 6 },


  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 12, marginVertical: 8, paddingHorizontal: 14, paddingVertical: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  companyTitle: { color: '#111827', fontWeight: '700', flex: 1, marginRight: 8 },
  contactName: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  smallChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, marginRight: 8 },
  smallChipText: { fontSize: 11, color: '#111827', fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  actionBtn: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginRight: 8 },
  actionBtnDisabled: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  actionBtnText: { marginLeft: 6, color: '#111827', fontSize: 11, fontWeight: '600' },
  actionBtnTextDisabled: { color: '#9ca3af' },
  desc: { color: '#374151', fontSize: 12, marginTop: 12 },
  infoLine: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  infoText: { color: '#6b7280', fontSize: 12 },
  infoLinkText: { color: '#0b6dff', fontSize: 12, fontWeight: '600' },
  roundIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0b0b1b', borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
  toolRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginRight: 8 },
  toolBtnText: { marginLeft: 6, color: '#111827', fontSize: 11, fontWeight: '700' },
  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard: { width: '100%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#111827', fontWeight: '700', fontSize: 16 },
  modalHint: { color: '#6b7280', marginTop: 4, marginBottom: 6 },
  modalField: { marginTop: 8 },
  modalLabel: { color: '#6b7280', fontSize: 12, marginBottom: 4, fontWeight: '600' },
  modalInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#111827' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalBtn: { height: 40, borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  modalBtnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  modalBtnGhostText: { color: '#111827', fontWeight: '700' },
  modalBtnPrimary: { backgroundColor: '#0b0b1b' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  attachRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  attachChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 6, marginRight: 8, marginTop: 8 },
  attachChipText: { marginLeft: 6, color: '#111827', fontSize: 11, maxWidth: 160 },
  attachAddBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 6, marginTop: 8 },
  attachAddText: { marginLeft: 6, color: '#111827', fontSize: 11, fontWeight: '700' },

  // deprecated leftover styles removed
});




