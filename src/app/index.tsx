import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearStoredSession,
  getStoredSession,
  loginWithQr,
  logoutSession,
  type OperatorSession,
} from '@/lib/qr-auth';

const GRID_LINES = Array.from({ length: 9 }, (_, index) => index + 1);

function TopBrand() {
  return (
    <View style={styles.topBrand}>
      <Image
        source={require('@/assets/images/logorepnet.png')}
        style={styles.brandLogo}
        resizeMode="contain"
      />
    </View>
  );
}

function QuickAccessBadge() {
  return (
    <View style={styles.quickBadge}>
      <View style={styles.badgePulse} />
      <Text style={styles.quickBadgeText}>Acceso rapido con QR</Text>
    </View>
  );
}

function ScannerCorner({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) {
  return <View style={[styles.scannerCorner, styles[position]]} />;
}

type ScannerFrameProps = {
  cameraActive: boolean;
  isScanning: boolean;
  statusText: string;
  onBarcodeScanned: (value: string) => void;
};

function ScannerFrame({ cameraActive, isScanning, statusText, onBarcodeScanned }: ScannerFrameProps) {
  return (
    <View style={styles.scannerOuter}>
      <View style={styles.scannerScreen}>
        {cameraActive && (
          <CameraView
            style={styles.cameraPreview}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isScanning ? undefined : ({ data }) => onBarcodeScanned(data)}
          />
        )}

        <View style={[styles.scannerGrid, styles.nonInteractiveOverlay]}>
          {GRID_LINES.map((line) => (
            <View key={`v-${line}`} style={[styles.gridLineVertical, { left: `${line * 10}%` }]} />
          ))}
          {GRID_LINES.map((line) => (
            <View key={`h-${line}`} style={[styles.gridLineHorizontal, { top: `${line * 10}%` }]} />
          ))}
        </View>

        <View style={[styles.scannerOverlay, styles.nonInteractiveOverlay]}>
          <ScannerCorner position="topLeft" />
          <ScannerCorner position="topRight" />
          <ScannerCorner position="bottomLeft" />
          <ScannerCorner position="bottomRight" />

          <View style={styles.focusTarget}>
            <View style={styles.focusRow}>
              <View style={styles.focusDash} />
              <View style={styles.focusGap} />
              <View style={styles.focusDash} />
            </View>
            <View style={styles.focusMiddle}>
              <View style={styles.focusDashVertical} />
              <View style={styles.focusDashVertical} />
            </View>
            <View style={styles.focusRow}>
              <View style={styles.focusDash} />
              <View style={styles.focusGap} />
              <View style={styles.focusDash} />
            </View>
          </View>
        </View>

        <View style={styles.cameraStatus}>
          <View style={[styles.statusDot, cameraActive && styles.statusDotActive]} />
          <Text numberOfLines={1} style={styles.cameraStatusText}>
            {statusText}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MercadoLibreBadge() {
  return (
    <View style={styles.integrationBadge}>
      <Text style={styles.integrationLabel}>INTEGRADO CON</Text>
      <View style={styles.integrationLogoWrap}>
        <Image
          source={require('@/assets/images/logomercadolibre.png')}
          style={styles.integrationLogo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

function ActiveSessionScreen({ session, onLogout, isLoggingOut }: { session: OperatorSession; onLogout: () => void; isLoggingOut: boolean }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.backgroundLayer} />
      <View style={styles.screen}>
        <View style={styles.header}>
          <TopBrand />
        </View>

        <View style={styles.activeSessionContent}>
          <View style={styles.sessionIndicator}>
            <View style={styles.sessionIndicatorDot} />
            <Text style={styles.sessionIndicatorText}>SESION ACTIVA</Text>
          </View>
          <Text style={styles.activeTitle}>Bienvenido, {session.operator.displayName}</Text>
          <Text style={styles.activeSubtitle}>Codigo de colaborador: {session.operator.employeeCode}</Text>

          <View style={styles.roleList}>
            {session.operator.roles.map((role) => (
              <View key={role} style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role}</Text>
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isLoggingOut}
            onPress={onLogout}
            style={({ pressed }) => [styles.logoutButton, (pressed || isLoggingOut) && styles.pressed]}>
            <Text style={styles.logoutButtonText}>{isLoggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <MercadoLibreBadge />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function LoginScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [session, setSession] = useState<OperatorSession | null>(null);
  const [statusText, setStatusText] = useState('Camara pausada');

  useEffect(() => {
    getStoredSession()
      .then(setSession)
      .finally(() => setIsLoadingSession(false));
  }, []);

  const activateCamera = async () => {
    if (!permission) {
      return;
    }

    let granted = permission.granted;
    if (!granted) {
      const nextPermission = await requestPermission();
      granted = nextPermission.granted;
    }

    if (!granted) {
      setStatusText('Permiso de camara requerido');
      return;
    }

    setCameraActive(true);
    setStatusText('Busca el codigo QR');
  };

  const handleBarcodeScanned = async (value: string) => {
    if (isScanning) {
      return;
    }

    setIsScanning(true);
    setStatusText('Validando credencial...');

    try {
      const nextSession = await loginWithQr(value);
      setCameraActive(false);
      setSession(nextSession);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'No fue posible validar la credencial.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = async () => {
    if (!session) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logoutSession(session.sessionToken);
    } finally {
      await clearStoredSession();
      setSession(null);
      setCameraActive(false);
      setStatusText('Camara pausada');
      setIsLoggingOut(false);
    }
  };

  if (!isLoadingSession && session) {
    return <ActiveSessionScreen session={session} onLogout={handleLogout} isLoggingOut={isLoggingOut} />;
  }

  const buttonText = cameraActive ? 'Camara activa' : 'Activar camara';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.backgroundLayer} />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TopBrand />
        </View>

        <View style={styles.hero}>
          <QuickAccessBadge />
          <Text style={styles.title}>Escanea tu credencial</Text>
          <Text style={styles.subtitle}>
            Apunta la camara al codigo QR de tu tarjeta{`\n`}de operador para ingresar.
          </Text>
        </View>

        <ScannerFrame
          cameraActive={cameraActive}
          isScanning={isScanning}
          statusText={statusText}
          onBarcodeScanned={handleBarcodeScanned}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={cameraActive || isLoadingSession}
            onPress={() => void activateCamera()}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || cameraActive || isLoadingSession) && styles.primaryButtonDisabled,
            ]}>
            <Text style={styles.primaryButtonText}>{buttonText}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <MercadoLibreBadge />
        </View>
      </View>
    </SafeAreaView>
  );
}

const colors = {
  blueDeep: '#0a46ba',
  blue: '#2461c9',
  blueSoft: '#5e8fd1',
  blueGlass: 'rgba(255, 255, 255, 0.13)',
  blueGlassStrong: 'rgba(255, 255, 255, 0.19)',
  navy: '#071a43',
  navyDeep: '#041236',
  white: '#ffffff',
  whiteMuted: '#c9dafd',
  yellow: '#ffea28',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d8eef8',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#d8eef8',
    experimental_backgroundImage:
      'linear-gradient(180deg, #f8fbfd 0%, #e3f3fa 25%, #c9e8f6 56%, #b9e0f2 100%)',
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 31,
    paddingBottom: 0,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBrand: {
    width: '100%',
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 240,
    height: 82,
  },
  hero: {
    alignItems: 'center',
    marginTop: 0,
  },
  quickBadge: {
    height: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  badgePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  quickBadgeText: {
    color: '#124d82',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  title: {
    marginTop: 22,
    color: '#0a3f70',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 9,
    color: '#245b83',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  scannerOuter: {
    width: 322,
    height: 322,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 44,
    borderRadius: 29,
    backgroundColor: 'rgba(9, 35, 94, 0.23)',
  },
  scannerScreen: {
    width: 286,
    height: 286,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 23,
    borderWidth: 13,
    borderColor: colors.navyDeep,
    backgroundColor: colors.navy,
    boxShadow: '0px 22px 34px rgba(4, 16, 49, 0.20)',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFill,
  },
  scannerGrid: {
    position: 'absolute',
    inset: 13,
    opacity: 0.85,
  },
  nonInteractiveOverlay: {
    pointerEvents: 'none',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(120, 153, 213, 0.19)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(120, 153, 213, 0.19)',
  },
  scannerCorner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: colors.yellow,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 18,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 18,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 18,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 18,
  },
  focusTarget: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(78, 110, 172, 0.55)',
  },
  focusRow: {
    width: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  focusGap: {
    width: 8,
  },
  focusDash: {
    width: 9,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  focusMiddle: {
    width: 28,
    height: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  focusDashVertical: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  cameraStatus: {
    position: 'absolute',
    bottom: 5,
    maxWidth: 230,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(7, 18, 54, 0.92)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a0a8b8',
  },
  statusDotActive: {
    backgroundColor: colors.yellow,
  },
  cameraStatusText: {
    flexShrink: 1,
    color: '#d9e3f7',
    fontSize: 11,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    marginTop: 35,
  },
  primaryButton: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.yellow,
    boxShadow: '0px 14px 28px rgba(255, 234, 40, 0.25)',
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: '#061332',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    marginTop: 36,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  integrationBadge: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 18,
    paddingRight: 13,
    borderRadius: 19,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(20, 91, 141, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.44)',
  },
  integrationLabel: {
    color: '#225d8b',
    fontSize: 10,
    fontWeight: '900',
  },
  integrationLogoWrap: {
    width: 88,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  integrationLogo: {
    width: 74,
    height: 18,
  },
  activeSessionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
  },
  sessionIndicator: {
    height: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
  },
  sessionIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2a9b68',
  },
  sessionIndicatorText: {
    color: '#126347',
    fontSize: 11,
    fontWeight: '900',
  },
  activeTitle: {
    marginTop: 24,
    paddingHorizontal: 16,
    color: '#0a3f70',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 33,
    textAlign: 'center',
  },
  activeSubtitle: {
    marginTop: 10,
    color: '#245b83',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  roleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
  },
  roleBadge: {
    minHeight: 31,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 97, 201, 0.14)',
  },
  roleBadgeText: {
    color: '#124d82',
    fontSize: 12,
    fontWeight: '800',
  },
  logoutButton: {
    width: '100%',
    maxWidth: 322,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 38,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(10, 63, 112, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.50)',
  },
  logoutButtonText: {
    color: '#0a3f70',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
