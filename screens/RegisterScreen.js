import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthdayDate, setBirthdayDate] = useState(new Date(2000, 0, 1));

  const { loginUser } = useAuth();

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleRegister = async () => {
    if (!username || !email || !birthday || !password || !confirmPassword) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }

    const birthdayRegex = /^\d{4}-\d{2}-\d{2}$/;
    

    if (!birthdayRegex.test(birthday)) {
      Alert.alert('Invalid Birthday', 'Please enter birthday as YYYY-MM-DD.');
      return;
    }

    if (password.length < 7 || password.length > 30) {
      Alert.alert(
        'Invalid Password',
        'Password must be between 7 and 30 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Error', 'Passwords do not match.');
      return;
    }

    const formData = new FormData();
    formData.append('Username', username);
    formData.append('Email', email);
    formData.append('Birthday', birthday);
    formData.append('Password', password);
    formData.append('ConfirmPassword', confirmPassword);

    try {
      const response = await fetch(
        'https://ballyplug.com/api/v1/auth/register.php',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        loginUser(data.user);
        navigation.replace('GuestReels');
      } else {
        Alert.alert('Registration Failed', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to BallyPlug server.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>B</Text>

        <Text style={styles.title}>
          Join Bally<Text style={styles.blue}>Plug</Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#8A8A8A"
          value={username}
          onFocus={() => setShowDatePicker(false)}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="off"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8A8A8A"
          value={email}
          onFocus={() => setShowDatePicker(false)}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: birthday ? '#FFFFFF' : '#8A8A8A', fontSize: 16 }}>
              {birthday || 'Select Birthday'}
            </Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={birthdayDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="dark"
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }

                if (selectedDate) {
                  setBirthdayDate(selectedDate);
                  setBirthday(formatDate(selectedDate));
                }
              }}
            />
          )}

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#8A8A8A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="off"
            textContentType="none"
            textContentType="oneTimeCode"
            importantForAutofill="no"
            autoCorrect={false}
            autoCapitalize="none"
            onFocus={() => setShowDatePicker(false)}
          />

          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={24}
              color="#8A8A8A"
            />
          </Pressable>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm Password"
            placeholderTextColor="#8A8A8A"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            textContentType="oneTimeCode"
            autoComplete="off"
            importantForAutofill="no"
            autoCorrect={false}
            autoCapitalize="none"
            onFocus={() => setShowDatePicker(false)}
          />

          <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color="#8A8A8A"
            />
          </Pressable>
        </View>


        <Pressable style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Already have an account? Log in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F14',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#0D0F14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  logo: {
    color: '#0D6EFD',
    fontSize: 70,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 28,
  },

  blue: {
    color: '#0D6EFD',
  },

  input: {
    width: '100%',
    backgroundColor: '#1A1F2B',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 13,
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
    marginTop: 8,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  loginLink: {
    color: '#0D6EFD',
    marginTop: 20,
    fontSize: 15,
    fontWeight: 'bold',
  },

  passwordContainer: {
  width: '100%',
  backgroundColor: '#1A1F2B',
  borderRadius: 12,
  marginBottom: 13,
  borderWidth: 1,
  borderColor: '#2B3240',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 15,
  },

  passwordInput: {
  flex: 1,
  color: '#FFFFFF',
  fontSize: 16,
  paddingVertical: 15,
  },
});