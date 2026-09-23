import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppIcon, type AppIconName } from '@/components/AppIcon';

import { AIControlCenterScreen } from '@/screens/ai-manager/AIControlCenterScreen';
import { AIProvidersScreen } from '@/screens/ai-manager/AIProvidersScreen';
import { AILogsScreen } from '@/screens/ai-manager/AILogsScreen';
import { AIManagerProfileScreen } from '@/screens/ai-manager/AIManagerProfileScreen';
import { AISettingsScreen } from '@/screens/ai-manager/AISettingsScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AITabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.roleAiManager,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const icon: Record<string, AppIconName> = {
            Center: 'robot', Providers: 'cog', Logs: 'clock', Profile: 'user',
          };
          return <AppIcon name={icon[route.name] ?? 'help'} size={size} color={color} />;
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
  const { colors, navigationTheme } = useTheme();
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Tabs" component={AITabs} options={{ headerShown: false }} />
        <Stack.Screen name="AISettings" component={AISettingsScreen} options={{ title: 'AI Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
