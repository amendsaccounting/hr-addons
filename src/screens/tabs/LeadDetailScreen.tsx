import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

(Ionicons as any)?.loadFont?.();

// Static-only screen matching the provided screenshot
export default function LeadDetailScreen({ onBack }: { name?: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'Details' | 'Notes' | 'Activity'>('Details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    phone: '554423299',
    mobile: '554423299',
    website: 'omnisworldwide.com',
    source: 'Frappe Lead',
    dateAdded: '2025-11-20',
    assignedTo: 'rajeev@addon-s.com',
    location: 'United Arab Emirates',
  });
  const lead = {
    name: 'CRM-LEAD-2025-02791',
    owner: 'support@amendsgroup.com',
    creation: '2025-11-20 10:12:34.185666',
    modified: '2025-11-20 10:12:34.225334',
    modified_by: 'support@amendsgroup.com',
    docstatus: 0,
    idx: 0,
    naming_series: 'CRM-LEAD-.YYYY.-',
    custom_date: '2025-11-20',
    salutation: 'Mr',
    annual_revenue: 0,
    blog_subscriber: 0,
    company: 'Addon-S L.L.C',
    company_name: 'Omnis World Wide Trading LLC',
    country: 'United Arab Emirates',
    custom_building__location: 'Omnis World Wide Trading LLC',
    custom_follow_up_details: 'Converted to Order',
    disabled: 0,
    doctype: 'Lead',
    first_name: 'Akarsh',
    gender: 'Male',
    language: 'en',
    lead_name: 'Mr Akarsh',
    lead_owner: 'rajeev@addon-s.com',
    mobile_no: '554423299',
    no_of_employees: '1-10',
    notes: [],
    phone: '554423299',
    qualification_status: 'Unqualified',
    request_type: '',
    source: 'Frappe Lead',
    status: 'Lead',
    territory: 'Rest Of The World',
    title: 'Omnis World Wide Trading LLC',
    type: '',
    unsubscribed: 0,
    website: 'omnisworldwide.com',
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
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* spacer under hero card */}
        <View style={{ height: 8 }} />

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <ActionButton label="Call" icon="call" primary />
          <ActionButton label="Message" icon="chatbubble" />
          <ActionButton label="Website" icon="globe-outline" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['Details', 'Notes', 'Activity'] as const).map(t => {
            const active = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabItem]}> 
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
                {active && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>

        {/* Cards (Details only, static) */}
        {tab === 'Details' && (
          <>
            <Card>
              <CardTitle>Contact Information</CardTitle>
              <EditableField label="Mobile Number" value={form.mobile} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, mobile: t }))} />
              <Divider />
              <EditableField label="Phone Number" value={form.phone} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))} />
              <Divider />
              <EditableField label="Website" value={form.website} editing={editing} onChangeText={(t) => setForm((p) => ({ ...p, website: t }))} />
            </Card>

            <Card>
              <CardTitle>Lead Details</CardTitle>
              <EditableField label="Lead Name" value={lead.lead_name} editing={false} />
              <Divider />
              <EditableField label="Salutation" value={lead.salutation} editing={false} />
              <Divider />
              <EditableField label="First Name" value={lead.first_name} editing={false} />
              <Divider />
              <EditableField label="Status" value={lead.status} editing={false} />
              <Divider />
              <EditableField label="Lead Source" value={lead.source} editing={false} />
              <Divider />
              <EditableField label="Qualification Status" value={lead.qualification_status} editing={false} />
              <Divider />
              <EditableField label="Lead Owner" value={lead.lead_owner} editing={false} />
              <Divider />
              <EditableField label="Territory" value={lead.territory} editing={false} />
              <Divider />
              <EditableField label="Company Name" value={lead.company_name} editing={false} />
              <Divider />
              <EditableField label="Company" value={lead.company} editing={false} />
              <Divider />
              <EditableField label="Title" value={lead.title} editing={false} />
              <Divider />
              <EditableField label="Country" value={lead.country} editing={false} />
              <Divider />
              <EditableField label="Location" value={lead.custom_building__location} editing={false} />
              <Divider />
              <EditableField label="Language" value={lead.language} editing={false} />
              <Divider />
              <EditableField label="Request Type" value={lead.request_type || '-'} editing={false} />
              <Divider />
              <EditableField label="Type" value={lead.type || '-'} editing={false} />
              <Divider />
              <EditableField label="No. of Employees" value={lead.no_of_employees} editing={false} />
              <Divider />
              <EditableField label="Website" value={lead.website} editing={false} />
            </Card>

            <Card>
              <CardTitle>System Info</CardTitle>
              <EditableField label="Name" value={lead.name} editing={false} />
              <Divider />
              <EditableField label="Naming Series" value={lead.naming_series} editing={false} />
              <Divider />
              <EditableField label="Custom Date" value={lead.custom_date} editing={false} />
              <Divider />
              <EditableField label="Owner" value={lead.owner} editing={false} />
              <Divider />
              <EditableField label="Creation" value={lead.creation} editing={false} />
              <Divider />
              <EditableField label="Modified" value={lead.modified} editing={false} />
              <Divider />
              <EditableField label="Modified By" value={lead.modified_by} editing={false} />
              <Divider />
              <EditableField label="DocType" value={lead.doctype} editing={false} />
              <Divider />
              <EditableField label="DocStatus" value={String(lead.docstatus)} editing={false} />
              <Divider />
              <EditableField label="Index" value={String(lead.idx)} editing={false} />
              <Divider />
              <EditableField label="Disabled" value={String(lead.disabled)} editing={false} />
              <Divider />
              <EditableField label="Blog Subscriber" value={String(lead.blog_subscriber)} editing={false} />
              <Divider />
              <EditableField label="Unsubscribed" value={String(lead.unsubscribed)} editing={false} />
              <Divider />
              <EditableField label="Annual Revenue" value={String(lead.annual_revenue)} editing={false} />
            </Card>

            <Card>
              <CardTitle>Notes / Follow-up</CardTitle>
              <EditableField label="Follow Up" value={lead.custom_follow_up_details} editing={false} />
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

function LeadHeroHeader({ onBack, insetsTop, editing, onEdit, onCancel, onSave }: { onBack?: () => void; insetsTop: number; editing?: boolean; onEdit?: () => void; onCancel?: () => void; onSave?: () => void }) {
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
          <Text style={styles.name}>Mr Akarsh</Text>
          <Text style={styles.role}>Omnis World Wide Trading LLC • United Arab Emirates</Text>
          <View style={{ marginTop: 8 }}>
            <View style={styles.statusChip}><Text style={styles.statusChipText}>Lead</Text></View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* UI Helpers */

function ActionButton({ label, icon, primary }: { label: string; icon: string; primary?: boolean }) {
  return (
    <Pressable style={[styles.actionBtn, primary ? styles.actionBtnPrimary : styles.actionBtnGhost]}>
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
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
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

  actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  actionBtnPrimary: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  actionBtnGhost: { backgroundColor: '#ffffff' },
  actionBtnText: { fontWeight: '600' },

  tabs: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8 },
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
