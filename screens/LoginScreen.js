import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { loginUser } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter your email and password.');
      return;
    }

    const formData = new FormData();
    formData.append('Email', email);
    formData.append('Password', password);

    try {
      const response = await fetch('https://ballyplug.com/api/login.php', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        loginUser(data.user);
        navigation.replace('GuestReels');
      } else {
        Alert.alert('Login Failed', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to BallyPlug server.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>B</Text>

      <Text style={styles.title}>
        Bally<Text style={styles.blue}>Plug</Text>
      </Text>

      <Text style={styles.tagline}>Connect. Watch. Share.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8A8A8A"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8A8A8A"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>LOGIN</Text>
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Text style={styles.signupText}>
        Don&apos;t have an account?
      </Text>

      <Pressable>
        <Text style={styles.signupLink}>Sign Up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  logo: {
    color: '#0D6EFD',
    fontSize: 80,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: 'bold',
  },

  blue: {
    color: '#0D6EFD',
  },

  tagline: {
    color: '#CFCFCF',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 40,
    letterSpacing: 2,
  },

  input: {
    width: '100%',
    backgroundColor: '#1A1F2B',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2B3240',
  },

  button: {
    width: '100%',
    backgroundColor: '#0D6EFD',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  orText: {
    color: '#8A8A8A',
    marginTop: 25,
    marginBottom: 15,
    fontSize: 16,
  },

  signupText: {
    color: '#CFCFCF',
    fontSize: 15,
  },

  signupLink: {
    color: '#0D6EFD',
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 8,
  },
});