import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { AIControlCenterScreen } from '@/screens/ai-manager/AIControlCenterScreen';
import { AIProvidersScreen } from '@/screens/ai-manager/AIProvidersScreen';
import { AILogsScreen } from '@/screens/ai-manager/AILogsScreen';
import { AIManagerProfileScreen } from '@/screens/ai-manager/AIManagerProfileScreen';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AITabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.roleAiManager,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const icon: Record<string, string> = {
            Center: '🎛️', Providers: '🔌', Logs: '📜', Profile: '👤',
          };
          return <Text style={{ fontSize: size, color }}>{icon[route.name] ?? '•'}</Text>;
        },
      })}
    >
      <Tab.Screen name="Center" component={AIControlCenterScreen} options={{ title: 'Control Center' }} />
      <Tab.Screen name="Providers" component={AIProvidersScreen} options={{ title: 'Providers' }} />
      <Tab.Screen name="Logs" component={AILogsScreen} options={{ title: 'Logs' }} />
      <Tab.Screen name="Profile" component={AIManagerProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

export function AIManagerNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={AITabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
