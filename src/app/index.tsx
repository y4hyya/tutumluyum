import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F5F2EA',
        justifyContent: 'flex-end',
        padding: 24,
        paddingBottom: 64,
      }}>
      <Text style={{ fontSize: 44, fontWeight: '900', letterSpacing: -1, color: '#0A0A0A' }}>
        TUTUMLUYUM
      </Text>
      <Text style={{ marginTop: 8, fontSize: 14, color: '#7A756B' }}>
        Ekstren telefonundan çıkmıyor.
      </Text>
    </View>
  );
}
