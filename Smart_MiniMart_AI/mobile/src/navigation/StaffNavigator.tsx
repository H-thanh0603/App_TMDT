import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { StaffOrdersScreen } from '@/screens/staff/StaffOrdersScreen';
import { ImportReceiptsScreen } from '@/screens/staff/ImportReceiptsScreen';
import { OCRScanScreen } from '@/screens/staff/OCRScanScreen';
import { ReceiptDetailScreen } from '@/screens/staff/ReceiptDetailScreen';
import { StaffProfileScreen } from '@/screens/staff/StaffProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function StaffTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.roleStaff,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const icon: Record<string, string> = {
            Orders: '📦', Imports: '📥', Notif: '🔔', Profile: '👤',
          };
          return <Text style={{ fontSize: size, color }}>{icon[route.name] ?? '•'}</Text>;
        },
      })}
    >
      <Tab.Screen name="Orders" component={StaffOrdersScreen} options={{ title: 'Đơn hàng' }} />
      <Tab.Screen name="Imports" component={ImportReceiptsScreen} options={{ title: 'Nhập hàng' }} />
      <Tab.Screen name="Notif" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      <Tab.Screen name="Profile" component={StaffProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

export function StaffNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.roleStaff }, headerTintColor: 'white' }}>
        <Stack.Screen name="Tabs" component={StaffTabs} options={{ headerShown: false }} />
        <Stack.Screen name="OCRScan" component={OCRScanScreen} options={{ title: 'Quét phiếu nhập' }} />
        <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} options={{ title: 'Chi tiết phiếu' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
