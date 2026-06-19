import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '@/components/MiniPlayer';
import { useAuth } from '@/store/auth';
import { colors, font, gradients } from '@/theme';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  search: 'search',
  library: 'musical-notes',
};
const LABELS: Record<string, string> = {
  index: 'Home',
  search: 'Search',
  library: 'Library',
  profile: 'Profile',
};

// Custom glass tab bar (SDK 56's expo-router no longer ships react-navigation's
// BottomTabBar). Mini-player sits above a frosted, blurred button row.
function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const initial = (user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.wrap}>
      <MiniPlayer />
      <View style={styles.barShell}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
        <View style={[styles.bar, { paddingBottom: insets.bottom || 10 }]}>
          {state.routes.map((route: any, index: number) => {
            const focused = state.index === index;
            const color = focused ? colors.primary : colors.textMuted;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            return (
              <Pressable key={route.key} style={styles.tab} onPress={onPress}>
                {focused && <View style={styles.activePill} />}
                {route.name === 'profile' ? (
                  <View style={[styles.avatar, focused && styles.avatarActive]}>
                    <LinearGradient
                      colors={gradients.brand}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                ) : (
                  <Ionicons
                    name={focused ? TAB_ICONS[route.name] : (`${TAB_ICONS[route.name]}-outline` as any)}
                    size={22}
                    color={color}
                  />
                )}
                <Text style={[styles.label, { color }]}>{LABELS[route.name] ?? route.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  barShell: {
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderSoft,
    overflow: 'hidden',
  },
  tint: { backgroundColor: 'rgba(10,8,18,0.55)' },
  bar: { flexDirection: 'row', paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 6 },
  activePill: {
    position: 'absolute',
    top: 0,
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: 0.7,
  },
  avatarActive: { opacity: 1, borderWidth: 1.5, borderColor: colors.white },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  label: { fontSize: font.tiny, fontWeight: '600' },
});
