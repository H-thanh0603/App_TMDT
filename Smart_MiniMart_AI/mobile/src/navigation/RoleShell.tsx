import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { StaffNavigator } from './StaffNavigator';
import { AdminNavigator } from './AdminNavigator';
import { AIManagerNavigator } from './AIManagerNavigator';

export function RoleShell() {
  const { user, initialized, initialize } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <AuthNavigator />;

  switch (user.role) {
    case 'CUSTOMER':    return <CustomerNavigator />;
    case 'STAFF':       return <StaffNavigator />;
    case 'STORE_ADMIN': return <AdminNavigator />;
    case 'AI_MANAGER':  return <AIManagerNavigator />;
    default:            return <AuthNavigator />;
  }
}
