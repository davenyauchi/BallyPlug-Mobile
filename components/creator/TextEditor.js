import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';

const TEXT_COLORS = [
  '#FFFFFF',
  '#000000',
  '#FF3B30',
  '#FFCC00',
  '#34C759',
  '#007AFF',
  '#AF52DE',
];

const TEXT_SIZES = [
  { label: 'S', value: 20 },
  { label: 'M', value: 28 },
  { label: 'L', value: 38 },
  { label: 'XL', value: 48 },
];

export default function TextEditor({
  editingOverlay = null,
  onSaveText,
  onClose,
  onDeleteText,
}) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(28);

  useEffect(() => {
    if (editingOverlay) {
      setText(editingOverlay.text || '');
      setColor(editingOverlay.color || '#FFFFFF');
      setFontSize(editingOverlay.fontSize || 28);
    } else {
      setText('');
      setColor('#FFFFFF');
      setFontSize(28);
    }
  }, [editingOverlay]);

  const handleSave = () => {
    const cleanedText = text.trim();

    if (!cleanedText) {
      return;
    }

    // Close the keyboard
    Keyboard.dismiss();

    if (editingOverlay) {
      onSaveText({
        ...editingOverlay,
        text: cleanedText,
        color,
        fontSize,
      });
    } else {
      onSaveText({
        id: `text-${Date.now()}`,
        text: cleanedText,
        color,
        fontSize,
        x: 120,
        y: 140,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>

        <Text style={styles.title}>
          {editingOverlay ? 'Edit Text' : 'Add Text'}
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={!text.trim()}
        >
          <Text
            style={[
              styles.done,
              !text.trim() && styles.disabled,
            ]}
          >
            Done
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={[
          styles.input,
          {
            color,
            fontSize,
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder="Type something..."
        placeholderTextColor="#777"
        multiline
       
        maxLength={200}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Color</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorRow}
        >
          {TEXT_COLORS.map((item) => {
            const selected = item === color;

            return (
              <Pressable
                key={item}
                onPress={() => setColor(item)}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: item,
                  },
                  selected && styles.selectedColor,
                ]}
              />
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Size</Text>

        <View style={styles.sizeRow}>
          {TEXT_SIZES.map((item) => {
            const selected = item.value === fontSize;

            return (
              <Pressable
                key={item.value}
                onPress={() => setFontSize(item.value)}
                style={[
                  styles.sizeButton,
                  selected && styles.selectedSize,
                ]}
              >
                <Text
                  style={[
                    styles.sizeText,
                    selected &&
                      styles.selectedSizeText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {editingOverlay && (
        <Pressable
          style={styles.deleteButton}
          onPress={() =>
            onDeleteText?.(editingOverlay.id)
          }
        >
          <Text style={styles.deleteButtonText}>
            Delete Text
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  cancel: {
    color: '#aaa',
    fontSize: 15,
  },

  done: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '700',
  },

  disabled: {
    opacity: 0.4,
  },

  input: {
    minHeight: 100,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },

  colorRow: {
    gap: 14,
    paddingVertical: 4,
  },

  colorButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#444',
  },

  selectedColor: {
    borderWidth: 3,
    borderColor: '#3b82f6',
  },

  sizeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  sizeButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedSize: {
    backgroundColor: '#fff',
  },

  sizeText: {
    color: '#fff',
    fontWeight: '700',
  },

  selectedSizeText: {
    color: '#000',
  },

  deleteButton: {
    marginTop: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },

  deleteButtonText: {
    color: '#EF4444',
    fontWeight: '700',
  },
});