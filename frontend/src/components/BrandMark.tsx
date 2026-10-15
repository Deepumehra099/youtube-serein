import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeProvider';

export function BrandMark({ size = 32 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.31, backgroundColor: colors.brandMark }]}>
      <Text style={[styles.letter, { color: colors.onBrandMark, fontSize: size * 0.68, lineHeight: size * 0.76 }]}>S</Text>
      <View style={[styles.spark, { backgroundColor: colors.accent, width: size * 0.13, height: size * 0.13, borderRadius: size * 0.07 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letter: { fontWeight: '900', includeFontPadding: false, letterSpacing: -1.5 },
  spark: { position: 'absolute', top: '22%', right: '21%' },
});
