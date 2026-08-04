import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useBroadcast } from '@/services/queries';
import { colors } from '@/theme/colors';

export function BroadcastScreen() {
  const send = useBroadcast(); const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const submit = async () => { if (!title.trim() || !body.trim()) return Alert.alert('Thiếu nội dung', 'Nhập tiêu đề và nội dung thông báo.'); try { const result = await send.mutateAsync({ title: title.trim(), body: body.trim(), targetRoles: ['CUSTOMER'] }); Alert.alert('Đã gửi', `Đã gửi tới ${result.sent} khách hàng.`); setTitle(''); setBody(''); } catch (error: any) { Alert.alert('Không thể gửi', error?.response?.data?.message ?? 'Vui lòng thử lại.'); } };
  return <SafeAreaView style={styles.container} edges={['bottom']}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Gửi thông báo</Text><Text style={styles.help}>Thông báo sẽ gửi đến toàn bộ khách hàng.</Text><TextInput style={styles.input} placeholder="Tiêu đề" value={title} onChangeText={setTitle} /><TextInput style={[styles.input, styles.body]} placeholder="Nội dung" multiline value={body} onChangeText={setBody} /><Button title="Gửi broadcast" fullWidth loading={send.isPending} onPress={() => void submit()} /></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.bgSecondary }, content: { padding: 16, gap: 12 }, title: { fontSize: 22, fontWeight: '800', color: colors.text }, help: { color: colors.textSecondary }, input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text }, body: { height: 150, textAlignVertical: 'top' } });
