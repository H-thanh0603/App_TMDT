import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { HomeScreen } from '@/screens/customer/HomeScreen';
import { ProductListScreen } from '@/screens/customer/ProductListScreen';
import { ProductDetailScreen } from '@/screens/customer/ProductDetailScreen';
import { AISearchScreen } from '@/screens/customer/AISearchScreen';
import { AIChatScreen } from '@/screens/customer/AIChatScreen';
import { CartScreen } from '@/screens/customer/CartScreen';
import { OrdersScreen } from '@/screens/customer/OrdersScreen';
import { OrderDetailScreen } from '@/screens/customer/OrderDetailScreen';
import { AddressesScreen } from '@/screens/customer/AddressesScreen';
import { ProfileScreen } from '@/screens/customer/ProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const icon: Record<string, string> = {
            Home: '🏠', Search: '🔍', AI: '🤖', Cart: '🛒', Profile: '👤',
          };
          return <Text style={{ fontSize: size, color }}>{icon[route.name] ?? '•'}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="Search" component={AISearchScreen} options={{ title: 'AI Search' }} />
      <Tab.Screen name="AI" component={AIChatScreen} options={{ title: 'Trợ lý' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'Giỏ hàng' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

export function CustomerNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: 'white', headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Screen name="Tabs" component={CustomerTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Sản phẩm' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Chi tiết sản phẩm' }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Đơn hàng của tôi' }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn' }} />
        <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Địa chỉ' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
