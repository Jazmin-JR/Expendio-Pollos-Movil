import { Platform } from 'react-native';

// Configuración del backend
const VERCEL_DOMAIN = 'integradora-six.vercel.app';
const USE_VERCEL = true; // Cambiar a false para usar IP local en desarrollo

// Configuración local (solo si USE_VERCEL es false)
const PHYSICAL_DEVICE_IP = '192.168.1.15'; 
const USE_PHYSICAL_IP = true; 
const LOCAL_PORT = 4000;

const getApiBaseUrl = () => {
  // Si está configurado para usar Vercel, usar el dominio de producción
  if (USE_VERCEL) {
    return `https://${VERCEL_DOMAIN}`;
  }

  // Configuración para desarrollo local
  if (Platform.OS === 'web') {
    return `http://localhost:${LOCAL_PORT}`;
  }

  if (USE_PHYSICAL_IP && PHYSICAL_DEVICE_IP) {
    return `http://${PHYSICAL_DEVICE_IP}:${LOCAL_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${LOCAL_PORT}`;
  }

  return `http://localhost:${LOCAL_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

