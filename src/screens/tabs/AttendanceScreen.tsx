import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();

export default function AttendanceScreen() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date | null>(new Date());
  const [gridWidth, setGridWidth] = useState(0);

  const monthName = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const days = useMemo(() => makeMonthGrid(cursor), [cursor]);

  const goPrev = useCallback(() => setCursor(p => new Date(p.getFullYear(), p.getMonth() - 1, 1)), []);
  const goNext = useCallback(() => setCursor(p => new Date(p.getFullYear(), p.getMonth() + 1, 1)), []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Attendance Calendar</Text>

      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={goPrev} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color="#111827" />
        </Pressable>
        <Text style={styles.monthText}>{monthName}</Text>
        <Pressable accessibilityRole="button" onPress={goNext} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <Text key={d} style={styles.weekHeaderText}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {days.map((cell, idx) => {
          const isSelected = selected && sameDay(cell.date, selected);
          const isEndCol = idx % 7 === 6;
          const isLastRow = idx >= 35; // 0..41 (last row indices 35..41)
          const cellSize = gridWidth > 0 ? Math.floor(gridWidth / 7) : 0;
          const measured = cellSize > 0 ? { width: cellSize, height: cellSize } : null;
          return (
            <Pressable
              key={idx}
              style={[
                styles.cell,
                measured,
                !cell.inMonth && styles.cellMuted,
                cell.isToday && styles.cellToday,
                isSelected && styles.cellSelected,
                isEndCol && styles.cellLastCol,
                isLastRow && styles.cellLastRow,
              ]}
              onPress={() => setSelected(cell.date)}
            >
              <Text
                style={[
                  styles.cellText,
                  !cell.inMonth && styles.cellTextMuted,
                  (cell.isToday || isSelected) && styles.cellTextToday,
                ]}
              >
                {cell.date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function makeMonthGrid(firstOfMonth: Date) {
  const year = firstOfMonth.getFullYear();
  const month = firstOfMonth.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // Start on Sunday

  const today = new Date();
  const cells: { date: Date; inMonth: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const inMonth = d.getMonth() === month;
    const isToday = sameDay(d, today);
    cells.push({ date: d, inMonth, isToday });
  }
  return cells;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, marginHorizontal: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginHorizontal: 12 },
  navBtn: { padding: 6 },
  monthText: { fontWeight: '700', color: '#111827' },
  weekHeader: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 6 },
  weekHeaderText: { flex: 1, textAlign: 'center', color: '#6b7280', fontSize: 12 },
  grid: { alignSelf: 'stretch', marginHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  cell: { flexBasis: '14.2857%', maxWidth: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  cellMuted: { backgroundColor: '#f9fafb' },
  cellToday: { backgroundColor: '#eef2ff' },
  cellSelected: { backgroundColor: '#e0e7ff' },
  cellLastCol: { borderRightWidth: 0 },
  cellLastRow: { borderBottomWidth: 0 },
  cellText: { color: '#111827' },
  cellTextMuted: { color: '#9ca3af' },
  cellTextToday: { fontWeight: '700', color: '#111827' },
});
