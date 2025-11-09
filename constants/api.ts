import { Platform } from 'react-native';


const PHYSICAL_DEVICE_IP = '192.168.1.18'; 
const USE_PHYSICAL_IP = true; 

const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  if (USE_PHYSICAL_IP && PHYSICAL_DEVICE_IP) {
    return `http://${PHYSICAL_DEVICE_IP}:4000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }


  return 'http://localhost:4000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

