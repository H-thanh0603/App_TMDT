import { MaterialCommunityIcons } from '@expo/vector-icons';

export type AppIconName =
  | 'home' | 'search' | 'robot' | 'cart' | 'user' | 'bell' | 'pin'
  | 'tag' | 'truck' | 'wallet' | 'qr' | 'camera' | 'box' | 'chart'
  | 'users' | 'cog' | 'logout' | 'chevron-right' | 'plus' | 'minus'
  | 'close' | 'check' | 'alert' | 'gift' | 'flash' | 'clock'
  | 'grid' | 'heart' | 'help' | 'sun' | 'moon';

const GLYPH: Record<AppIconName, keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: 'home',
  search: 'magnify',
  robot: 'robot',
  cart: 'cart',
  user: 'account',
  bell: 'bell',
  pin: 'map-marker',
  tag: 'tag',
  truck: 'truck',
  wallet: 'wallet',
  qr: 'qrcode-scan',
  camera: 'camera',
  box: 'package-variant',
  chart: 'chart-bar',
  users: 'account-group',
  cog: 'cog',
  logout: 'logout',
  'chevron-right': 'chevron-right',
  plus: 'plus',
  minus: 'minus',
  close: 'close',
  check: 'check',
  alert: 'alert-circle',
  gift: 'gift',
  flash: 'flash',
  clock: 'clock-outline',
  grid: 'view-grid',
  heart: 'heart',
  help: 'help-circle',
  sun: 'weather-sunny',
  moon: 'weather-night',
};

interface Props {
  name: AppIconName;
  size?: number;
  color?: string;
}

/** Icon ngữ nghĩa duy nhất toàn app — cấm emoji làm icon UI. */
export function AppIcon({ name, size = 22, color = '#000' }: Props) {
  return <MaterialCommunityIcons name={GLYPH[name] ?? GLYPH.help} size={size} color={color} />;
}
