import React, { useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Modal,
  ScrollView, Platform,
} from 'react-native';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Props:
//   visible: boolean
//   trips: array of trips (each has .year and .month strings, month is "01".."12")
//   title: string (e.g. "Export Personal Report" or "Export Team Report")
//   onCancel: () => void
//   onExport: ({ year, months }) => void
//     - year: 'ALL' or '2026'
//     - months: 'ALL' or array of numbers [1..12]
const PeriodPickerModal = ({ visible, trips, title, onCancel, onExport }) => {
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonths, setSelectedMonths] = useState([]); // array of numbers
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Extract unique years from trips
  const years = useMemo(() => {
    const set = new Set();
    (trips || []).forEach(t => { if (t.year) set.add(String(t.year)); });
    return Array.from(set).sort().reverse();
  }, [trips]);

  const toggleMonth = (monthNum) => {
    if (selectedYear === 'ALL') return; // must pick year first
    setSelectedMonths(prev =>
      prev.includes(monthNum)
        ? prev.filter(m => m !== monthNum)
        : [...prev, monthNum].sort((a, b) => a - b)
    );
  };

  const selectAllMonths = () => {
    if (selectedYear === 'ALL') return;
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };

  const clearAllMonths = () => setSelectedMonths([]);

  const handleExport = () => {
    let year = selectedYear;
    let months = 'ALL';

    if (selectedYear !== 'ALL') {
      if (selectedMonths.length === 0) {
        months = 'ALL'; // whole year
      } else {
        months = selectedMonths;
      }
    }

    onExport({ year, months });
    // reset for next time
    setSelectedYear('ALL');
    setSelectedMonths([]);
    setShowYearPicker(false);
  };

  const handleCancel = () => {
    setSelectedYear('ALL');
    setSelectedMonths([]);
    setShowYearPicker(false);
    onCancel();
  };

  const summaryText = (() => {
    if (selectedYear === 'ALL') return 'All trips (every year)';
    if (selectedMonths.length === 0) return `All of ${selectedYear}`;
    if (selectedMonths.length === 12) return `All of ${selectedYear}`;
    return `${selectedMonths.map(m => MONTH_LABELS[m - 1]).join(', ')} ${selectedYear}`;
  })();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title || 'Export Report'}</Text>

          {/* Year selector */}
          <Text style={styles.sectionLabel}>Year</Text>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setShowYearPicker(s => !s)}
          >
            <Text style={styles.yearBtnText}>
              {selectedYear === 'ALL' ? 'All Years' : selectedYear}
            </Text>
            <Text style={styles.yearBtnArrow}>▼</Text>
          </TouchableOpacity>

          {showYearPicker && (
            <View style={styles.yearDropdown}>
              <TouchableOpacity
                style={styles.yearItem}
                onPress={() => {
                  setSelectedYear('ALL');
                  setSelectedMonths([]);
                  setShowYearPicker(false);
                }}
              >
                <Text style={styles.yearItemText}>All Years</Text>
              </TouchableOpacity>
              {years.map(y => (
                <TouchableOpacity
                  key={y}
                  style={styles.yearItem}
                  onPress={() => {
                    setSelectedYear(y);
                    setSelectedMonths([]);
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={styles.yearItemText}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Month grid */}
          <View style={styles.monthHeader}>
            <Text style={styles.sectionLabel}>Months</Text>
            <View style={styles.monthHeaderBtns}>
              <TouchableOpacity onPress={selectAllMonths} disabled={selectedYear === 'ALL'}>
                <Text style={[styles.monthActionText, selectedYear === 'ALL' && styles.disabled]}>
                  Select All
                </Text>
              </TouchableOpacity>
              <Text style={styles.monthHeaderSep}> · </Text>
              <TouchableOpacity onPress={clearAllMonths} disabled={selectedYear === 'ALL'}>
                <Text style={[styles.monthActionText, selectedYear === 'ALL' && styles.disabled]}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.monthGrid}>
            {MONTH_LABELS.map((label, idx) => {
              const m = idx + 1;
              const isSelected = selectedMonths.includes(m);
              const isDisabled = selectedYear === 'ALL';
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.monthCell,
                    isSelected && styles.monthCellSelected,
                    isDisabled && styles.monthCellDisabled,
                  ]}
                  onPress={() => toggleMonth(m)}
                  disabled={isDisabled}
                >
                  <Text style={[
                    styles.monthCellText,
                    isSelected && styles.monthCellTextSelected,
                    isDisabled && styles.monthCellTextDisabled,
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedYear === 'ALL' && (
            <Text style={styles.hint}>Pick a year first to select specific months.</Text>
          )}

          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{summaryText}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.exportBtn]} onPress={handleExport}>
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 8,
    marginBottom: 6,
  },
  yearBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  yearBtnText: { fontSize: 15, color: '#333', fontWeight: '600' },
  yearBtnArrow: { fontSize: 12, color: '#666' },
  yearDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 200,
  },
  yearItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearItemText: { fontSize: 15, color: '#333' },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  monthHeaderBtns: { flexDirection: 'row', alignItems: 'center' },
  monthActionText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  monthHeaderSep: { fontSize: 12, color: '#ccc' },
  disabled: { color: '#ccc' },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  monthCell: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  monthCellSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  monthCellDisabled: { opacity: 0.4 },
  monthCellText: { fontSize: 13, color: '#333', fontWeight: '600' },
  monthCellTextSelected: { color: '#fff' },
  monthCellTextDisabled: { color: '#999' },
  hint: { fontSize: 11, color: '#999', marginTop: 4, textAlign: 'center' },
  summaryBox: {
    backgroundColor: '#f0f7ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  summaryText: { fontSize: 13, color: '#007AFF', textAlign: 'center', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  cancelBtn: { backgroundColor: '#e9ecef' },
  cancelBtnText: { color: '#333', fontWeight: 'bold' },
  exportBtn: { backgroundColor: '#007AFF' },
  exportBtnText: { color: '#fff', fontWeight: 'bold' },
});

export default PeriodPickerModal;
