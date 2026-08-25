import { useEffect, useState } from 'react';
import {
  Appearance,
  DynamicColorIOS,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ColorSchemeName,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const THEME_KEY = 'cj_theme_preference';

type ThemePreference = 'light' | 'dark';

function dynamicColor(light: string, dark: string) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;
}

function SunIcon({ active }: { active: boolean }) {
  const color = active ? dynamicColor('#0b8f61', '#78f25f') : dynamicColor('#7e8a85', '#687872');
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.6" stroke={color} strokeWidth="1.8" />
      <Line x1="12" y1="2.5" x2="12" y2="5.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="12" y1="18.8" x2="12" y2="21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="2.5" y1="12" x2="5.2" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="18.8" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="5.3" y1="5.3" x2="7.2" y2="7.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="16.8" y1="16.8" x2="18.7" y2="18.7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="16.8" y1="7.2" x2="18.7" y2="5.3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="5.3" y1="18.7" x2="7.2" y2="16.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function MoonIcon({ active }: { active: boolean }) {
  const color = active ? dynamicColor('#0b8f61', '#78f25f') : dynamicColor('#7e8a85', '#687872');
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M19.6 15.1A8.2 8.2 0 0 1 8.9 4.4 8.2 8.2 0 1 0 19.6 15.1Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ThemeToggle() {
  const [scheme, setScheme] = useState<ColorSchemeName>('dark');

  useEffect(() => {
    let active = true;

    SecureStore.getItemAsync(THEME_KEY).then(async (stored) => {
      if (!active) return;
      if (stored === 'light' || stored === 'dark') {
        Appearance.setColorScheme(stored);
        setScheme(stored);
      } else {
        Appearance.setColorScheme('dark');
        setScheme('dark');
        try {
          await SecureStore.setItemAsync(THEME_KEY, 'dark');
        } catch {
          // O tema escuro continua ativo mesmo se a preferência não puder ser persistida.
        }
      }
    }).catch(() => {
      Appearance.setColorScheme('dark');
      if (active) setScheme('dark');
    });

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (active) setScheme(colorScheme ?? 'dark');
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const dark = scheme !== 'light';

  async function toggle() {
    const next: ThemePreference = dark ? 'light' : 'dark';
    Appearance.setColorScheme(next);
    setScheme(next);
    try {
      await SecureStore.setItemAsync(THEME_KEY, next);
    } catch {
      // A troca visual continua funcionando mesmo se a preferência não puder ser persistida.
    }
  }

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: dark }}
      accessibilityLabel={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      <View style={[styles.side, !dark && styles.sideActive]}><SunIcon active={!dark} /></View>
      <View style={[styles.side, dark && styles.sideActive]}><MoonIcon active={dark} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 62,
    height: 32,
    padding: 3,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dynamicColor('#e7eeea', '#0d1916'),
  },
  side: {
    flex: 1,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideActive: {
    backgroundColor: dynamicColor('#ffffff', '#163228'),
  },
  pressed: {
    opacity: 0.72,
  },
});
