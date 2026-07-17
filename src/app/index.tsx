import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QR_MATRIX = [
  '111010111',
  '101000101',
  '111011111',
  '000100000',
  '110111010',
  '010001110',
  '111010001',
  '101011101',
  '111001101',
];

function QrMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.qrGrid, compact && styles.qrGridCompact]}>
      {QR_MATRIX.flatMap((row, rowIndex) =>
        row.split('').map((cell, colIndex) => (
          <View
            key={`${rowIndex}-${colIndex}`}
            style={[
              styles.qrCell,
              compact && styles.qrCellCompact,
              cell === '1' && styles.qrCellFilled,
            ]}
          />
        ))
      )}
    </View>
  );
}

function FooterIcon({ type }: { type: 'support' | 'language' }) {
  if (type === 'support') {
    return (
      <View style={styles.supportIcon}>
        <Text style={styles.supportIconText}>?</Text>
      </View>
    );
  }

  return (
    <View style={styles.languageIcon}>
      <View style={styles.languageLineHorizontal} />
      <View style={styles.languageLineVertical} />
    </View>
  );
}

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logomercadolibre.png')}
              style={styles.mercadoLibreLogo}
              resizeMode="contain"
            />
            <View style={styles.logoDivider} />
            <Image
              source={require('@/assets/images/logorepnet.png')}
              style={styles.repnetLogo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>WMS TERMINAL</Text>
          <Text style={styles.subtitle}>Acceso para colaboradores del almacén</Text>

          <View style={styles.loginPanel}>
            <View style={styles.qrFrame}>
              <QrMark />
            </View>

            <Pressable style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}>
              <QrMark compact />
              <View style={styles.scanButtonCopy}>
                <Text style={styles.scanButtonTitle}>ESCANEAR CÓDIGO QR</Text>
                <Text style={styles.scanButtonSubtitle}>PARA ACCESO INSTANTÁNEO</Text>
              </View>
            </Pressable>

            <Text style={styles.helperText}>
              Acerque su credencial de{'\n'}
              colaborador al escáner para iniciar{'\n'}
              sesión automáticamente.
            </Text>

            <View style={styles.separator} />

            <View style={styles.notice}>
              <View style={styles.noticeIcon}>
                <Text style={styles.noticeIconText}>i</Text>
              </View>
              <Text style={styles.noticeText}>
                Este sistema está optimizado para{'\n'}
                su uso en terminales de mano y{'\n'}
                dispositivos industriales con{'\n'}
                guantes.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <FooterIcon type="support" />
              <Text style={styles.footerText}>Soporte Técnico</Text>
            </View>
            <View style={styles.footerItem}>
              <FooterIcon type="language" />
              <Text style={styles.footerText}>Idioma: Español</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const colors = {
  background: '#fbf8f8',
  border: '#d4d8de',
  navy: '#082b50',
  text: '#102947',
  textMuted: '#34445a',
  yellow: '#fff15a',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  screen: {
    width: '100%',
    maxWidth: 310,
    minHeight: 690,
    paddingHorizontal: 17,
    paddingTop: 39,
    paddingBottom: 21,
    backgroundColor: colors.background,
  },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mercadoLibreLogo: {
    width: 124,
    height: 38,
  },
  logoDivider: {
    width: 1,
    height: 29,
    marginHorizontal: 14,
    backgroundColor: '#d2d5da',
  },
  repnetLogo: {
    width: 76,
    height: 31,
  },
  title: {
    marginTop: 17,
    color: colors.navy,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 5,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  loginPanel: {
    marginTop: 24,
    minHeight: 496,
    paddingTop: 43,
    paddingHorizontal: 24,
    paddingBottom: 25,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fffefe',
    boxShadow: '2px 3px 2px rgba(0, 0, 0, 0.13)',
    elevation: 2,
  },
  qrFrame: {
    width: 148,
    height: 148,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#365471',
    backgroundColor: '#ffffff',
    boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.12)',
  },
  qrGrid: {
    width: 66,
    height: 66,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrGridCompact: {
    width: 22,
    height: 22,
  },
  qrCell: {
    width: 7,
    height: 7,
    margin: 0.16,
    backgroundColor: '#ffffff',
  },
  qrCellCompact: {
    width: 2.4,
    height: 2.4,
    margin: 0.03,
  },
  qrCellFilled: {
    backgroundColor: colors.navy,
  },
  scanButton: {
    width: '100%',
    height: 56,
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    backgroundColor: colors.navy,
  },
  pressed: {
    opacity: 0.78,
  },
  scanButtonCopy: {
    gap: 2,
  },
  scanButtonTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 17,
  },
  scanButtonSubtitle: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 12,
  },
  helperText: {
    marginTop: 20,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    marginTop: 44,
    marginBottom: 18,
    backgroundColor: '#d9dfe6',
  },
  notice: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  noticeIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    backgroundColor: colors.navy,
  },
  noticeIconText: {
    width: 12,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    color: colors.navy,
    backgroundColor: colors.yellow,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
  },
  noticeText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  footer: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 23,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
  },
  supportIcon: {
    width: 11,
    height: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5.5,
    borderColor: colors.navy,
  },
  supportIconText: {
    color: colors.navy,
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
  languageIcon: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageLineHorizontal: {
    position: 'absolute',
    width: 10,
    height: 1,
    backgroundColor: colors.navy,
  },
  languageLineVertical: {
    width: 1,
    height: 10,
    backgroundColor: colors.navy,
  },
});
