import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import logo from '../../assets/images/logo/logo.png';
import { onboardingService } from '../../services/onboardingService'; // your service

type Props = {
  employeeId: string;
};

export default function OnboardingScreen({ employeeId }: Props) {
  const navigation = useNavigation();
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [existingCompanyId, setExistingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch employee data on mount
    const fetchEmployeeCompany = async () => {
      try {
        const companyId = await onboardingService.getEmployeeCompany(employeeId);
        if (companyId) {
          setExistingCompanyId(companyId);

          // Optionally fetch company details
          const company = await onboardingService.getCompanyByName(companyId);
          if (company) {
            setCompanyName(company.company_name);
            setCompanyUrl(company.company_url || '');
          }
        }
      } catch (error) {
        console.log('Error fetching employee/company:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchEmployeeCompany();
  }, [employeeId]);

  const handleContinue = async () => {
    if (!companyName.trim() || !companyUrl.trim()) {
      Alert.alert('Error', 'Please enter both company name and URL.');
      return;
    }

    setLoading(true);

    try {
      if (existingCompanyId) {
        // Employee already has a company → navigate to LoginScreen
        navigation.replace('LoginScreen' as never);
      } else {
        // New employee → create company
        await onboardingService.createCompany({
          company_name: companyName,
          company_url: companyUrl,
        });
        navigation.replace('LoginScreen' as never);
      }
    } catch (error) {
      console.log('Error submitting company:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = companyName.trim() !== '' && companyUrl.trim() !== '';

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.mainContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Image
                    source={logo}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                </View>
              </View>

              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Welcome</Text>
                <Text style={styles.subtitle}>
                  Enter your company details to get started
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            {/* Form Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Company Information</Text>

              {/* Company Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company Name</Text>
                <TextInput
                  style={styles.input}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Enter your company name"
                  placeholderTextColor="#94a3b8"
                  editable={!existingCompanyId} // disable editing if company exists
                />
              </View>

              {/* Company URL Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company URL</Text>
                <TextInput
                  style={styles.input}
                  value={companyUrl}
                  onChangeText={setCompanyUrl}
                  placeholder="https://yourcompany.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!existingCompanyId} // disable editing if company exists
                />
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleContinue}
                disabled={!isFormValid || loading}
                style={[
                  styles.button,
                  (!isFormValid || loading) && styles.buttonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Processing...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden', // This ensures the image stays within the circle
  },
  logoImage: {
    width: '100%', // Fill the entire circle
    height: '100%', // Fill the entire circle
  },
  greetingContainer: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 40,
  },

  // Form Section
  formSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
