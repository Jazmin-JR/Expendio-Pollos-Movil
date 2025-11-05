import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

const LOGIN_ENDPOINT = `${API_URL}/auth/login`;

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handleLogin = async () => {
    if (!usuario.trim() || !contraseña.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Log para debugging (solo en desarrollo)
      console.log('Intentando conectar a:', LOGIN_ENDPOINT);
      console.log('Datos enviados:', { email: usuario.trim(), password: '***' });
      
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
        } catch {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
        }
        
        // Mensajes específicos según el código de estado
        if (response.status === 404) {
          errorMessage = `Ruta no encontrada: ${LOGIN_ENDPOINT}\n\nVerifica que:\n- La ruta del endpoint sea correcta\n- El servidor tenga configurada la ruta /api/auth/login\n- El método HTTP sea POST`;
        } else if (response.status === 401) {
          errorMessage = 'Usuario o contraseña incorrectos';
        } else if (response.status === 500) {
          errorMessage = 'Error interno del servidor';
        }
        
        console.error('Error del servidor:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Guardar el token en AsyncStorage
      if (data.token) {
        await AsyncStorage.setItem('authToken', data.token);
      }

      // Si hay más datos del usuario, también los guardamos
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }

      // Navegar a las tabs principales
      router.replace('/(tabs)');
    } catch (err) {
      let errorMessage = 'Error de conexión';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('Error de login:', err);
        
        // Mensajes más descriptivos para errores comunes
        if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
          errorMessage = `No se pudo conectar al servidor en ${LOGIN_ENDPOINT}.\n\nVerifica que:\n1. El servidor esté corriendo en el puerto 4000\n2. Tu celular y PC estén en la misma red WiFi\n3. El firewall de Windows permita conexiones en el puerto 4000\n4. El servidor esté escuchando en 0.0.0.0 (no solo localhost)\n5. La IP configurada sea correcta: ${LOGIN_ENDPOINT}`;
        }
      }
      
      setError(errorMessage);
      Alert.alert('Error de conexión', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Login
        </ThemedText>

        {error ? (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={[styles.errorText, { color: '#ff3333' }]}>
              {error}
            </ThemedText>
          </ThemedView>
        ) : null}

        <TextInput
          style={[styles.input, { color: textColor, borderColor: tintColor }]}
          placeholder="Email"
          placeholderTextColor={textColor + '80'}
          value={usuario}
          onChangeText={(text) => {
            setUsuario(text);
            setError('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={[styles.input, { color: textColor, borderColor: tintColor }]}
          placeholder="Contraseña"
          placeholderTextColor={textColor + '80'}
          value={contraseña}
          onChangeText={(text) => {
            setContraseña(text);
            setError('');
          }}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: tintColor },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Iniciar Sesión</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#ff333320',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

