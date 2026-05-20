import React, { useState } from 'react';
import {
  Alert, Image, ScrollView, StyleSheet, Text, View, Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useScanReceipt } from '@/services/queries';
import { colors } from '@/theme/colors';

const SAMPLE_IMAGES = [
  { label: 'Phiếu mẫu 1 (rõ nét)', url: 'https://placehold.co/600x800/png?text=Phieu+nhap+1' },
  { label: 'Phiếu mẫu 2', url: 'https://placehold.co/600x800/png?text=Phieu+nhap+2' },
  { label: 'Phiếu mẫu 3', url: 'https://placehold.co/600x800/png?text=Phieu+nhap+3' },
];

const ENGINES = [
  { label: 'Mock OCR (demo)', value: 'MOCK' },
  { label: 'PaddleOCR (Python)', value: 'PADDLE_OCR' },
  { label: 'EasyOCR', value: 'EASY_OCR' },
];

export function OCRScanScreen() {
  const nav = useNavigation<any>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [engine, setEngine] = useState<string>('MOCK');
  const scan = useScanReceipt();

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập ảnh để upload phiếu nhập');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Quyền camera', 'Cần cấp quyền camera để chụp phiếu nhập');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleScan = async (url?: string) => {
    const target = url ?? imageUri;
    if (!target) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chụp/upload hoặc chọn ảnh mẫu');
      return;
    }
    try {
      const receipt = await scan.mutateAsync({ imageUrl: target, engine });
      Alert.alert(
        'OCR thành công',
        `Đã trích xuất ${(receipt as any).items?.length ?? 0} sản phẩm. Bạn cần kiểm tra trước khi xác nhận nhập kho.`,
        [{ text: 'Xem chi tiết', onPress: () =>
          nav.replace('ReceiptDetail', { id: (receipt as any).id }) }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi OCR', err.response?.data?.message ?? 'Quét thất bại');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.label}>OCR Engine</Text>
        <View style={styles.engineRow}>
          {ENGINES.map((e) => (
            <Pressable key={e.value} onPress={() => setEngine(e.value)}
              style={[styles.engineChip, engine === e.value && styles.engineChipActive]}>
              <Text style={[styles.engineText, engine === e.value && styles.engineTextActive]}>
                {e.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Ảnh phiếu nhập</Text>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{ fontSize: 56 }}>📄</Text>
            <Text style={styles.placeholderText}>Chưa có ảnh</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={takePhoto}><Text style={styles.outlineBtnText}>📷 Chụp ảnh</Text></Pressable>
          <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={pickFromGallery}><Text style={styles.outlineBtnText}>📁 Tải lên</Text></Pressable>
        </View>

        <Pressable
          style={[styles.scanBtn, !imageUri && { opacity: 0.5 }]}
          onPress={() => handleScan()}
          disabled={!imageUri || scan.isPending}
        >
          {scan.isPending ? <ActivityIndicator color="white" /> : <Text style={styles.scanBtnText}>🔍 Quét OCR</Text>}
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.label}>Hoặc dùng ảnh mẫu (demo)</Text>
        {SAMPLE_IMAGES.map((s) => (
          <Pressable key={s.url} style={styles.sampleItem}
            onPress={() => handleScan(s.url)}>
            <Text style={styles.sampleLabel}>📋 {s.label}</Text>
            <Text style={styles.sampleArrow}>→</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 12 },
  engineRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  engineChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  engineChipActive: { backgroundColor: colors.roleStaff, borderColor: colors.roleStaff },
  engineText: { fontSize: 11, color: colors.text },
  engineTextActive: { color: '#fff', fontWeight: '600' },
  preview: { width: '100%', aspectRatio: 3/4, borderRadius: 12, backgroundColor: colors.bgSecondary },
  placeholder: { aspectRatio: 3/4, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.textSecondary, marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  sampleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  sampleLabel: { fontSize: 13, color: colors.text },
  sampleArrow: { fontSize: 20, color: colors.primary, fontWeight: 'bold' },
  outlineBtn: {
    paddingVertical: 12, alignItems: 'center', borderRadius: 10,
    backgroundColor: 'white', borderWidth: 1.5, borderColor: colors.primary,
  },
  outlineBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  scanBtn: {
    backgroundColor: colors.primary, padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 12,
  },
  scanBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
