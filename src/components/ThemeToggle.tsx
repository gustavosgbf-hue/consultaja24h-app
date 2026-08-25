import { useEffect, useState } from 'react';
import {
  Appearance,
  DynamicColorIOS,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorSchemeName,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'cj_theme_preference';

type ThemePreference = 'light' | 'dark';

function dynamicColor(light: string, dark: string) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;
}

export default function ThemeToggle() {
  const [scheme, setScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    let active = true;

    SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (!active) return;
      if (stored === 'light' || stored === 'dark') {
        Appearance.setColorScheme(stored);
        setScheme(stored);
      } else {
        setScheme(Appearance.getColorScheme());
      }
    }).catch(() => undefined);

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (active) setScheme(colorScheme);
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
      <View style={[styles.side, !dark && styles.sideActive]}>
        <Text style={[styles.icon, !dark && styles.iconActive]}>☀</Text>
      </View>
      <View style={[styles.side, dark && styles.sideActive]}>
        <Text style={[styles.icon, dark && styles.iconActive]}>☾</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 64,
    height: 34,
    padding: 3,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dynamicColor('#e7eeea', '#0d1916'),
    borderWidth: 1,
    borderColor: dynamicColor('#cedbd4', '#27463c'),
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
  icon: {
    color: dynamicColor('#7e8a85', '#687872'),
    fontSize: 15,
    fontWeight: '700',
    marginTop: -1,
  },
  iconActive: {
    color: dynamicColor('#0b8f61', '#78f25f'),
  },
  pressed: {
    opacity: 0.72,
  },
});
