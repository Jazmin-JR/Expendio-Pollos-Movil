import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowRightOnRectangleIcon, ExclamationCircleIcon } from 'react-native-heroicons/outline';

const LOGIN_ENDPOINT = `${API_URL}/auth/login`;

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!usuario.trim() || !contraseña.trim()) {
      setError('Por favor completa todos los campos');
      return;
    } 

    setLoading(true);
    setError('');

    try {
      console.log('Intentando conectar a:', LOGIN_ENDPOINT);
      console.log('Datos enviados:', { email: usuario.trim(), password: '***' });

      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: usuario.trim(),
          password: contraseña,
        }),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Error al iniciar sesión';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {}

        if (response.status === 401) {
          errorMessage = 'Usuario o contraseña incorrectos';
        } else if (response.status === 404) {
          errorMessage = `Ruta no encontrada: ${LOGIN_ENDPOINT}`;
        } else if (response.status === 500) {
          errorMessage = 'Error interno del servidor';
        }

        console.error('Error del servidor:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.token) {
        await AsyncStorage.setItem('authToken', data.token);
      }
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }

      router.replace('/dashboard');
    } catch (err) {
      let errorMessage = 'Error de conexión';
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('Error de login:', err);
      }
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('@/assets/logo-nuevo.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>Portal de Empleados</Text>
        <Text style={styles.subtitle}>Ingresa con tu cuenta corporativa</Text>

        {error ? (
          <View style={styles.errorBox}>
            <ExclamationCircleIcon size={20} color="red" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="email@examp.com"
          value={usuario}
          onChangeText={setUsuario}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contraseña</Text>

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={contraseña}
          onChangeText={setContraseña}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={styles.buttonContent}>
              <ArrowRightOnRectangleIcon size={22} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          ¿Problemas para acceder? Contacta al administrador
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF791A', 
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  image: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    marginLeft: 4,
    
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#f59e0b',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  helpText: {
    marginTop: 12,
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    flexShrink: 1,
  },
  
});
