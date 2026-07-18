import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearStoredSession,
  getStoredSession,
  loginWithQr,
  logoutSession,
  type OperatorSession,
} from '@/lib/qr-auth';

const GRID_LINES = Array.from({ length: 9 }, (_, index) => index + 1);
const PICKING_ITEMS = [
  { bin: 'A-12-04', quantity: 'x2', sku: 'SKU-990-AX-1', name: 'Acople de acero industrial - 15mm', shipping: 'flex' },
  { bin: 'B-05-11', quantity: 'x1', sku: 'SKU-122-BB-9', name: 'Kit de sello hidraulico heavy duty', shipping: 'other' },
  { bin: 'C-22-01', quantity: 'x5', sku: 'SKU-441-ZZ-0', name: 'Tuerca de nylon M8 - Zincada', shipping: 'flex' },
  { bin: 'D-01-09', quantity: 'x4', sku: 'SKU-882-MM-2', name: 'Empaque alta temperatura 200mm', shipping: 'other' },
];

type WorkspaceTab = 'picking' | 'returns' | 'receipts';
type PickingFilter = 'all' | 'flex' | 'other';

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

function SessionValidationOverlay({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View style={[styles.validationOverlay, { opacity }]}>
      <View style={styles.validationCard}>
        <Image
          source={require('@/assets/images/logorepnet.png')}
          style={styles.validationLogo}
          resizeMode="contain"
        />
        <ActivityIndicator color={colors.blueDeep} size="large" style={styles.validationSpinner} />
        <Text style={styles.validationTitle}>Validando credencial</Text>
        <Text style={styles.validationSubtitle}>Estamos iniciando tu sesion.</Text>
      </View>
    </Animated.View>
  );
}

function ActiveSessionScreen({ session, onLogout, isLoggingOut }: { session: OperatorSession; onLogout: () => void; isLoggingOut: boolean }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('picking');
  const [pickingFilter, setPickingFilter] = useState<PickingFilter>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const tabTitle =
    activeTab === 'picking'
      ? 'Items pendientes'
      : activeTab === 'returns'
        ? 'Devoluciones/Garantías'
        : 'Ingresos';
  const visiblePickingItems = PICKING_ITEMS.filter(
    (item) => pickingFilter === 'all' || item.shipping === pickingFilter
  );

  return (
    <SafeAreaView style={styles.workspaceSafeArea}>
      <StatusBar style="dark" />
      <View style={styles.workspaceBackground} />
      <Animated.View
        style={[
          styles.workspaceScreen,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.workspaceHeader}>
          <View style={styles.workspaceIdentity}>
            <View style={styles.workspaceAvatar}>
              <Text style={styles.workspaceAvatarText}>RN</Text>
            </View>
            <View>
              <Text style={styles.workspaceTitle}>REPNET WMS</Text>
              <Text numberOfLines={1} style={styles.workspaceGreeting}>
                Hola, {session.operator.displayName}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Opciones de sesion"
            accessibilityRole="button"
            onPress={() => setIsMenuOpen((isOpen) => !isOpen)}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons color="#245b83" name="cog-outline" size={25} />
          </Pressable>

          {isMenuOpen && (
            <View style={styles.sessionMenu}>
              <Text style={styles.sessionMenuLabel}>Sesion activa</Text>
              <Text numberOfLines={1} style={styles.sessionMenuName}>
                {session.operator.displayName}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isLoggingOut}
                onPress={onLogout}
                style={({ pressed }) => [styles.sessionMenuLogout, (pressed || isLoggingOut) && styles.pressed]}>
                <MaterialCommunityIcons color="#0a3f70" name="logout" size={17} />
                <Text style={styles.sessionMenuLogoutText}>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.workspaceContent}>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.scanCodeButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons color={colors.white} name="barcode-scan" size={27} />
            <Text style={styles.scanCodeButtonText}>ESCANEAR CODIGO</Text>
          </Pressable>

          {activeTab === 'picking' && (
            <View accessibilityRole="tablist" style={styles.pickingFilters}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: pickingFilter === 'all' }}
                onPress={() => setPickingFilter('all')}
                style={({ pressed }) => [styles.pickingFilter, pickingFilter === 'all' && styles.pickingFilterActive, pressed && styles.pressed]}>
                <Text style={[styles.pickingFilterText, pickingFilter === 'all' && styles.pickingFilterTextActive]}>Flex</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: pickingFilter === 'flex' }}
                onPress={() => setPickingFilter('flex')}
                style={({ pressed }) => [styles.pickingFilter, pickingFilter === 'flex' && styles.pickingFilterActive, pressed && styles.pressed]}>
                <Text style={[styles.pickingFilterText, pickingFilter === 'flex' && styles.pickingFilterTextActive]}>Ventas No Flex</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: pickingFilter === 'other' }}
                onPress={() => setPickingFilter('other')}
                style={({ pressed }) => [styles.pickingFilter, pickingFilter === 'other' && styles.pickingFilterActive, pressed && styles.pressed]}>
                <Text style={[styles.pickingFilterText, pickingFilter === 'other' && styles.pickingFilterTextActive]}>Todos</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <View>
                <Text style={styles.progressLabel}>PROGRESO DE PICKING</Text>
                <Text style={styles.progressOrder}>Orden #WP-8829</Text>
              </View>
              <View style={styles.progressCount}>
                <Text style={styles.progressCountNumber}>08 / 12</Text>
                <Text style={styles.progressCountLabel}>ITEMS</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressValue} />
            </View>
          </View>

          <View style={styles.workspaceSectionHeader}>
            <Text style={styles.workspaceSectionTitle}>{tabTitle.toUpperCase()}</Text>
            <MaterialCommunityIcons color="#245b83" name="tune-variant" size={20} />
          </View>

          {activeTab === 'picking' ? (
            <View style={styles.pendingItemsList}>
              {visiblePickingItems.map((item) => (
                <Pressable key={item.bin} accessibilityRole="button" style={({ pressed }) => [styles.pendingItem, pressed && styles.pressed]}>
                  <View style={styles.pendingItemAccent} />
                  <View style={styles.pendingItemContent}>
                    <View style={styles.pendingItemTopRow}>
                      <Text style={styles.binBadge}>BIN: {item.bin}</Text>
                      <Text style={styles.itemQuantity}>{item.quantity}</Text>
                    </View>
                    <Text style={styles.itemSku}>{item.sku}</Text>
                    <Text numberOfLines={1} style={styles.itemName}>
                      {item.name}
                    </Text>
                  </View>
                  <MaterialCommunityIcons color="#53677c" name="chevron-right" size={22} />
                </Pressable>
              ))}
              <Text style={styles.priorityEnd}>Fin de la lista de prioridad</Text>
            </View>
          ) : (
            <View style={styles.emptyWorkspace}>
              <MaterialCommunityIcons color="#2461c9" name={activeTab === 'returns' ? 'undo-variant' : 'tray-arrow-down'} size={36} />
              <Text style={styles.emptyWorkspaceTitle}>Sin tareas pendientes</Text>
              <Text style={styles.emptyWorkspaceText}>No hay movimientos asignados para este momento.</Text>
            </View>
          )}
        </View>

        <View style={styles.workspaceTabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'picking' }}
            onPress={() => setActiveTab('picking')}
            style={({ pressed }) => [styles.workspaceTab, activeTab === 'picking' && styles.workspaceTabActive, pressed && styles.pressed]}>
            <MaterialCommunityIcons color={activeTab === 'picking' ? colors.navyDeep : '#d9e3f7'} name="package-variant-closed" size={22} />
            <Text style={[styles.workspaceTabText, activeTab === 'picking' && styles.workspaceTabTextActive]}>PICKING</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'returns' }}
            onPress={() => setActiveTab('returns')}
            style={({ pressed }) => [styles.workspaceTab, activeTab === 'returns' && styles.workspaceTabActive, pressed && styles.pressed]}>
            <MaterialCommunityIcons color={activeTab === 'returns' ? colors.navyDeep : '#d9e3f7'} name="undo-variant" size={22} />
            <Text style={[styles.workspaceTabText, activeTab === 'returns' && styles.workspaceTabTextActive]}>DEVOLUCIONES/{'\n'}GARANTÍAS</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'receipts' }}
            onPress={() => setActiveTab('receipts')}
            style={({ pressed }) => [styles.workspaceTab, activeTab === 'receipts' && styles.workspaceTabActive, pressed && styles.pressed]}>
            <MaterialCommunityIcons color={activeTab === 'receipts' ? colors.navyDeep : '#d9e3f7'} name="tray-arrow-down" size={22} />
            <Text style={[styles.workspaceTabText, activeTab === 'receipts' && styles.workspaceTabTextActive]}>INGRESOS</Text>
          </Pressable>
        </View>
      </Animated.View>
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
  const [isValidating, setIsValidating] = useState(false);
  const [validationOpacity] = useState(() => new Animated.Value(0));

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
    setIsValidating(true);
    setStatusText('Validando credencial...');
    validationOpacity.setValue(0);
    Animated.timing(validationOpacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();

    try {
      const nextSession = await loginWithQr(value);
      await new Promise<void>((resolve) => {
        Animated.timing(validationOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => resolve());
      });
      setCameraActive(false);
      setSession(nextSession);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'No fue posible validar la credencial.');
      await new Promise<void>((resolve) => {
        Animated.timing(validationOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => resolve());
      });
    } finally {
      setIsValidating(false);
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

      {isValidating && <SessionValidationOverlay opacity={validationOpacity} />}
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
  validationOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(210, 237, 246, 0.92)',
  },
  validationCard: {
    width: 268,
    height: 268,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    borderRadius: 134,
    borderWidth: 2,
    borderColor: 'rgba(36, 97, 201, 0.20)',
    backgroundColor: colors.white,
    boxShadow: '0px 18px 38px rgba(4, 16, 49, 0.20)',
  },
  validationLogo: {
    width: 172,
    height: 58,
  },
  validationSpinner: {
    marginTop: 18,
  },
  validationTitle: {
    marginTop: 16,
    color: colors.navyDeep,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  validationSubtitle: {
    marginTop: 5,
    color: '#3a607e',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
  },
  workspaceSafeArea: {
    flex: 1,
    backgroundColor: '#d8eef8',
  },
  workspaceBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#d8eef8',
    experimental_backgroundImage:
      'linear-gradient(180deg, #f8fbfd 0%, #e8f5fa 34%, #d2edf6 100%)',
  },
  workspaceScreen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  workspaceHeader: {
    zIndex: 2,
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36, 91, 131, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
  workspaceIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  workspaceAvatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.yellow,
    backgroundColor: colors.blueDeep,
  },
  workspaceAvatarText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  workspaceTitle: {
    color: colors.navyDeep,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
  },
  workspaceGreeting: {
    maxWidth: 235,
    marginTop: 1,
    color: '#245b83',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  settingsButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 21,
  },
  sessionMenu: {
    position: 'absolute',
    top: 67,
    right: 18,
    width: 220,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 63, 112, 0.14)',
    backgroundColor: colors.white,
    boxShadow: '0px 12px 26px rgba(4, 16, 49, 0.18)',
  },
  sessionMenuLabel: {
    color: '#53728e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sessionMenuName: {
    marginTop: 3,
    color: '#0a3f70',
    fontSize: 14,
    fontWeight: '800',
  },
  sessionMenuLogout: {
    height: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    borderRadius: 7,
    backgroundColor: 'rgba(36, 97, 201, 0.12)',
  },
  sessionMenuLogoutText: {
    color: '#0a3f70',
    fontSize: 13,
    fontWeight: '800',
  },
  workspaceContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 86,
  },
  scanCodeButton: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    borderRadius: 21,
    backgroundColor: colors.blueDeep,
    boxShadow: '0px 13px 26px rgba(10, 70, 186, 0.22)',
  },
  scanCodeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pickingFilters: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 15,
    padding: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(36, 91, 131, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
  },
  pickingFilter: {
    minWidth: 67,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  pickingFilterActive: {
    backgroundColor: colors.yellow,
  },
  pickingFilterText: {
    color: '#245b83',
    fontSize: 11,
    fontWeight: '800',
  },
  pickingFilterTextActive: {
    color: colors.navyDeep,
  },
  progressCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 63, 112, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    boxShadow: '0px 3px 5px rgba(7, 26, 67, 0.10)',
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#245b83',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  progressOrder: {
    marginTop: 8,
    color: colors.navyDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  progressCount: {
    alignItems: 'flex-end',
  },
  progressCountNumber: {
    color: colors.blueDeep,
    fontSize: 21,
    fontWeight: '900',
  },
  progressCountLabel: {
    marginTop: 1,
    color: '#53728e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    marginTop: 19,
    borderRadius: 4,
    backgroundColor: '#e4edf1',
  },
  progressValue: {
    width: '67%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  workspaceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingHorizontal: 3,
  },
  workspaceSectionTitle: {
    color: '#245b83',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pendingItemsList: {
    gap: 10,
    marginTop: 15,
  },
  pendingItem: {
    minHeight: 93,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 63, 112, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    boxShadow: '0px 3px 5px rgba(7, 26, 67, 0.09)',
  },
  pendingItemAccent: {
    width: 7,
    alignSelf: 'stretch',
    backgroundColor: colors.yellow,
  },
  pendingItemContent: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    paddingLeft: 15,
    paddingRight: 8,
  },
  pendingItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  binBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: colors.blueDeep,
  },
  itemQuantity: {
    color: '#3678ef',
    fontSize: 17,
    fontWeight: '900',
  },
  itemSku: {
    marginTop: 7,
    color: colors.navyDeep,
    fontSize: 13,
    fontWeight: '900',
  },
  itemName: {
    marginTop: 4,
    color: '#3a607e',
    fontSize: 12,
    fontWeight: '500',
  },
  priorityEnd: {
    marginTop: 10,
    color: '#53728e',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyWorkspace: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 15,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 63, 112, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
  },
  emptyWorkspaceTitle: {
    marginTop: 3,
    color: '#0a3f70',
    fontSize: 16,
    fontWeight: '900',
  },
  emptyWorkspaceText: {
    color: '#3a607e',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
  },
  workspaceTabs: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.blueDeep,
  },
  workspaceTab: {
    width: 108,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 5,
    borderRadius: 18,
  },
  workspaceTabActive: {
    backgroundColor: colors.yellow,
  },
  workspaceTabText: {
    color: '#d9e3f7',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
    textAlign: 'center',
  },
  workspaceTabTextActive: {
    color: colors.navyDeep,
  },
  pressed: {
    opacity: 0.78,
  },
});
