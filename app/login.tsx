import { API_URL } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          console.log('Datos del error del servidor:', errorData);
          
          // Intentar obtener el mensaje de error más específico
          errorMessage = errorData.message || errorData.error || errorData.msg || errorMessage;
          
          // Si hay más detalles, guardarlos
          if (errorData.details) {
            errorDetails = errorData.details;
          } else if (errorData.stack && __DEV__) {
            // Solo mostrar stack en desarrollo
            errorDetails = errorData.stack;
          }
        } catch (parseError) {
          // Si no se puede parsear el JSON, intentar leer como texto
          console.log('No se pudo parsear el error como JSON:', parseError);
          try {
            const textError = await response.text();
            console.log('Error como texto:', textError);
            if (textError) {
              errorMessage = textError;
            }
          } catch {}
        }

        // Mensajes específicos según el código de estado
        if (response.status === 401) {
          errorMessage = 'Usuario o contraseña incorrectos';
        } else if (response.status === 404) {
          errorMessage = `Ruta no encontrada: ${LOGIN_ENDPOINT}`;
        } else if (response.status === 500) {
          errorMessage = errorMessage || 'Error interno del servidor';
          errorMessage += '\n\nPor favor, verifica que el servidor esté funcionando correctamente.';
          if (errorDetails && __DEV__) {
            errorMessage += `\n\nDetalles: ${errorDetails}`;
          }
        } else if (response.status === 400) {
          errorMessage = errorMessage || 'Datos inválidos. Verifica tu email y contraseña.';
        }

        console.error('Error del servidor:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // El backend devuelve: { success: true, data: { usuario: {...}, token: "..." } }
      if (data.success && data.data && data.data.token) {
        // ✅ Guardar el token (ruta correcta: data.data.token)
        await AsyncStorage.setItem('authToken', data.data.token);
        console.log('Token guardado correctamente');
        console.log('Token:', data.data.token.substring(0, 20) + '...');
      } else if (data.token) {
        // Fallback para estructura antigua
        await AsyncStorage.setItem('authToken', data.token);
        console.log('Token guardado (estructura antigua)');
      } else {
        console.error('Error: No se recibió token en la respuesta');
        console.error('Respuesta completa:', JSON.stringify(data, null, 2));
      }

      // Guardar datos del usuario
      if (data.success && data.data && data.data.usuario) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.data.usuario));
      } else if (data.user) {
        // Fallback para estructura antigua
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }

      router.replace('/(tabs)');
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
        <View style={styles.logoContainer}>
          <Ionicons name="restaurant" size={80} color="#FF791A" />
        </View>
        <Text style={styles.title}>Portal de Empleados</Text>
        <Text style={styles.subtitle}>Ingresa con tu cuenta corporativa</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="red" style={{ marginRight: 8 }} />
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
              <Ionicons name="log-in" size={22} color="white" style={{ marginRight: 8 }} />
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
  logoContainer: {
    width: 160,
    height: 160,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
