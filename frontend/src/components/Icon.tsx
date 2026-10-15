import { View } from 'react-native';
import type { ColorValue, ViewStyle } from 'react-native';

export type IconName = 'home' | 'shorts' | 'create' | 'subscriptions' | 'library' | 'search' | 'notifications' | 'profile' | 'cast' | 'close' | 'more' | 'history' | 'refresh' | 'share' | 'like' | 'comment' | 'save' | 'back' | 'settings' | 'forward' | 'play';

export function AppIcon({ name, color, size = 22 }: { name: IconName; color: ColorValue; size?: number }) {
  const k = size / 22;
  const part = (width: number, height: number, extra: ViewStyle = {}): ViewStyle => ({ position: 'absolute', width: width * k, height: height * k, borderColor: color, ...extra });
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {name === 'home' && <>
      <View style={part(12, 12, { top: 0, left: 5, borderLeftWidth: 2 * k, borderTopWidth: 2 * k, borderTopLeftRadius: 2 * k, transform: [{ rotate: '45deg' }] })} />
      <View style={part(15, 13, { bottom: 1 * k, left: 3.5 * k, borderWidth: 2 * k, borderTopWidth: 0, borderBottomLeftRadius: 2 * k, borderBottomRightRadius: 2 * k })} />
      <View style={part(3, 6, { bottom: 1 * k, left: 9.5 * k, backgroundColor: color, borderTopLeftRadius: 2 * k, borderTopRightRadius: 2 * k })} />
    </>}
    {name === 'shorts' && <>
      <View style={part(13, 19, { top: 1.5 * k, left: 4.5 * k, borderWidth: 2 * k, borderRadius: 5 * k, transform: [{ rotate: '-9deg' }] })} />
      <View style={part(0, 0, { top: 8 * k, left: 9 * k, borderTopWidth: 3.5 * k, borderBottomWidth: 3.5 * k, borderLeftWidth: 6 * k, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color })} />
    </>}
    {name === 'create' && <>
      <View style={part(18, 2, { top: 10 * k, left: 2 * k, backgroundColor: color, borderRadius: 2 * k })} />
      <View style={part(2, 18, { top: 2 * k, left: 10 * k, backgroundColor: color, borderRadius: 2 * k })} />
    </>}
    {name === 'subscriptions' && <>
      <View style={part(18, 14, { top: 3 * k, left: 2 * k, borderWidth: 2 * k, borderRadius: 2 * k })} />
      <View style={part(0, 0, { top: 7 * k, left: 9 * k, borderTopWidth: 3 * k, borderBottomWidth: 3 * k, borderLeftWidth: 5 * k, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color })} />
      <View style={part(12, 2, { bottom: 1 * k, left: 5 * k, backgroundColor: color, borderRadius: 2 * k })} />
    </>}
    {name === 'profile' && <>
      <View style={part(8, 8, { top: 1 * k, left: 7 * k, borderRadius: 5 * k, borderWidth: 2 * k })} />
      <View style={part(17, 9, { bottom: 1 * k, left: 2.5 * k, borderWidth: 2 * k, borderTopLeftRadius: 9 * k, borderTopRightRadius: 9 * k, borderBottomWidth: 0 })} />
    </>}
    {name === 'library' && <>
      <View style={part(16, 17, { top: 2 * k, left: 3 * k, borderWidth: 2 * k, borderRadius: 2 * k })} />
      {[7, 11, 15].map((top) => <View key={top} style={part(9, 1.5, { top: top * k, left: 6.5 * k, backgroundColor: color })} />)}
    </>}
    {name === 'search' && <>
      <View style={part(14, 14, { top: 1 * k, left: 1 * k, borderWidth: 2 * k, borderRadius: 8 * k })} />
      <View style={part(8, 2, { top: 16 * k, left: 14 * k, backgroundColor: color, transform: [{ rotate: '45deg' }] })} />
    </>}
    {name === 'notifications' && <>
      <View style={part(15, 16, { top: 2 * k, left: 3.5 * k, borderWidth: 2 * k, borderTopLeftRadius: 9 * k, borderTopRightRadius: 9 * k, borderBottomLeftRadius: 4 * k, borderBottomRightRadius: 4 * k })} />
      <View style={part(6, 2, { top: 19 * k, left: 8 * k, backgroundColor: color, borderRadius: 2 * k })} />
      <View style={part(3, 3, { top: 22 * k, left: 9.5 * k, borderRadius: 2 * k, backgroundColor: color })} />
    </>}
    {name === 'cast' && <>
      <View style={part(17, 13, { top: 1 * k, left: 2.5 * k, borderWidth: 2 * k, borderRadius: 2 * k })} />
      <View style={part(8, 2, { bottom: 2 * k, left: 3 * k, backgroundColor: color, transform: [{ rotate: '-45deg' }] })} />
      <View style={part(5, 5, { bottom: 1 * k, left: 2 * k, borderWidth: 2 * k, borderTopRightRadius: 6 * k, borderLeftWidth: 0, borderBottomWidth: 0 })} />
    </>}
    {name === 'close' && <>
      <View style={part(18, 2, { top: 10 * k, left: 2 * k, backgroundColor: color, transform: [{ rotate: '45deg' }] })} />
      <View style={part(18, 2, { top: 10 * k, left: 2 * k, backgroundColor: color, transform: [{ rotate: '-45deg' }] })} />
    </>}
    {name === 'more' && <>{[3, 10, 17].map((left) => <View key={left} style={part(2.5, 2.5, { top: 9.75 * k, left: left * k, borderRadius: 2 * k, backgroundColor: color })} />)}</>}
    {name === 'history' && <>
      <View style={part(16, 16, { top: 2 * k, left: 3 * k, borderWidth: 2 * k, borderRadius: 9 * k })} />
      <View style={part(2, 6, { top: 5 * k, left: 10 * k, backgroundColor: color, borderRadius: 1 * k })} />
      <View style={part(5, 2, { top: 10 * k, left: 10 * k, backgroundColor: color, borderRadius: 1 * k })} />
      <View style={part(6, 2, { top: 2 * k, left: 2 * k, backgroundColor: color, transform: [{ rotate: '-35deg' }] })} />
    </>}
    {name === 'refresh' && <>
      <View style={part(16, 16, { top: 2 * k, left: 3 * k, borderWidth: 2 * k, borderRightColor: 'transparent', borderRadius: 9 * k, transform: [{ rotate: '-35deg' }] })} />
      <View style={part(0, 0, { top: 1 * k, right: 1 * k, borderTopWidth: 4 * k, borderBottomWidth: 4 * k, borderLeftWidth: 5 * k, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color, transform: [{ rotate: '-20deg' }] })} />
    </>}
    {name === 'share' && <>
      <View style={part(2, 11, { top: 5 * k, left: 10 * k, backgroundColor: color })} />
      {[{ top: 2, left: 9 }, { top: 9, left: 2 }, { top: 16, left: 9 }].map((node) => <View key={`${node.top}-${node.left}`} style={part(7, 7, { top: node.top * k, left: node.left * k, borderRadius: 4 * k, backgroundColor: color })} />)}
      <View style={part(8, 2, { top: 7 * k, left: 4 * k, backgroundColor: color, transform: [{ rotate: '-30deg' }] })} />
      <View style={part(8, 2, { top: 13 * k, left: 4 * k, backgroundColor: color, transform: [{ rotate: '30deg' }] })} />
    </>}
    {name === 'like' && <View style={part(18, 16, { top: 3 * k, left: 2 * k, borderWidth: 2 * k, borderTopLeftRadius: 9 * k, borderTopRightRadius: 9 * k, borderBottomLeftRadius: 7 * k, borderBottomRightRadius: 7 * k, transform: [{ rotate: '-45deg' }] })} />}
    {name === 'comment' && <><View style={part(18, 14, { top: 2 * k, left: 2 * k, borderWidth: 2 * k, borderRadius: 5 * k })} /><View style={part(5, 5, { bottom: 1 * k, left: 4 * k, borderLeftWidth: 2 * k, borderBottomWidth: 2 * k, transform: [{ skewY: '-35deg' }] })} /></>}
    {name === 'save' && <View style={part(14, 18, { top: 2 * k, left: 4 * k, borderWidth: 2 * k, borderTopLeftRadius: 2 * k, borderTopRightRadius: 2 * k, borderBottomLeftRadius: 7 * k, borderBottomRightRadius: 7 * k })} />}
    {name === 'back' && <><View style={part(15, 2, { top: 10 * k, left: 4 * k, backgroundColor: color })} /><View style={part(8, 2, { top: 7 * k, left: 3 * k, backgroundColor: color, transform: [{ rotate: '-45deg' }] })} /><View style={part(8, 2, { top: 13 * k, left: 3 * k, backgroundColor: color, transform: [{ rotate: '45deg' }] })} /></>}
    {name === 'settings' && <><View style={part(15, 15, { top: 3.5 * k, left: 3.5 * k, borderWidth: 2 * k, borderRadius: 5 * k })} /><View style={part(5, 5, { top: 8.5 * k, left: 8.5 * k, borderWidth: 2 * k, borderRadius: 3 * k })} /></>}
    {name === 'forward' && <>
      <View style={part(9, 2, { top: 6 * k, left: 8 * k, backgroundColor: color, transform: [{ rotate: '45deg' }] })} />
      <View style={part(9, 2, { top: 13 * k, left: 8 * k, backgroundColor: color, transform: [{ rotate: '-45deg' }] })} />
    </>}
    {name === 'play' && <View style={part(0, 0, { top: 4 * k, left: 6 * k, borderTopWidth: 7 * k, borderBottomWidth: 7 * k, borderLeftWidth: 11 * k, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color })} />}
  </View>;
}
