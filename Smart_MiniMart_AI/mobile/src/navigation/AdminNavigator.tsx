import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { AdminProductsScreen } from '@/screens/admin/AdminProductsScreen';
import { AdminInventoryScreen } from '@/screens/admin/AdminInventoryScreen';
import { AdminOrdersScreen } from '@/screens/admin/AdminOrdersScreen';
import { AdminUsersScreen } from '@/screens/admin/AdminUsersScreen';
import { AdminPromotionsScreen } from '@/screens/admin/AdminPromotionsScreen';
import { AdminCategoriesScreen } from '@/screens/admin/AdminCategoriesScreen';
import { AdminProfileScreen } from '@/screens/admin/AdminProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.roleAdmin,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const icon: Record<string, string> = {
            Dashboard: '📊', Products: '📦', Orders: '🛍️', Users: '👥', Profile: '👤',
          };
          return <Text style={{ fontSize: size, color }}>{icon[route.name] ?? '•'}</Text>;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="Products" component={AdminProductsScreen} options={{ title: 'Sản phẩm' }} />
      <Tab.Screen name="Orders" component={AdminOrdersScreen} options={{ title: 'Đơn hàng' }} />
      <Tab.Screen name="Users" component={AdminUsersScreen} options={{ title: 'Người dùng' }} />
      <Tab.Screen name="Profile" component={AdminProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.roleAdmin }, headerTintColor: 'white' }}>
        <Stack.Screen name="Tabs" component={AdminTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Inventory" component={AdminInventoryScreen} options={{ title: 'Kho hàng' }} />
        <Stack.Screen name="Categories" component={AdminCategoriesScreen} options={{ title: 'Danh mục' }} />
        <Stack.Screen name="Promotions" component={AdminPromotionsScreen} options={{ title: 'Khuyến mãi' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
