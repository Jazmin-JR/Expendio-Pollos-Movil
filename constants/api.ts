import { Platform } from 'react-native';

// Configuración de la API
// Para dispositivos físicos, configura tu IP local aquí:
const PHYSICAL_DEVICE_IP = '192.168.1.18'; // Cambia esta IP si es necesario
const USE_PHYSICAL_IP = true; // true para dispositivos físicos, false para emuladores

// Para Android emulador: usa 10.0.2.2
// Para iOS emulador: usa localhost
// Para dispositivos físicos: usa la IP de tu máquina
// Para web: usa localhost

const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // Si estás usando un dispositivo físico, usa la IP configurada
  if (USE_PHYSICAL_IP && PHYSICAL_DEVICE_IP) {
    return `http://${PHYSICAL_DEVICE_IP}:4000`;
  }

  if (Platform.OS === 'android') {
    // En Android emulador, 10.0.2.2 apunta al localhost de la máquina host
    return 'http://10.0.2.2:4000';
  }

  // iOS emulador puede usar localhost
  return 'http://localhost:4000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

