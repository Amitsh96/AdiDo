import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { AuthService } from '../services/AuthService';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    console.log('ProfileScreen: handleLogout called');
    
    // Use window.confirm for web compatibility instead of Alert.alert
    const confirmed = window.confirm('Are you sure you want to logout?');
    
    if (confirmed) {
      try {
        console.log('ProfileScreen: Signing out');
        await AuthService.signOut();
        console.log('ProfileScreen: Sign out successful, navigating to Login');
        navigation.replace('Login');
      } catch (error) {
        console.error('ProfileScreen: Logout error:', error);
        window.alert(`Failed to logout: ${error.message}`);
      }
    } else {
      console.log('ProfileScreen: Logout cancelled');
    }
  };

  const handleSync = () => {
    console.log('ProfileScreen: handleSync called');
    window.alert('Data synced successfully!');
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileInfo}>
        <Text style={styles.username}>
          Welcome, {user?.email || 'User'}!
        </Text>
        <Text style={styles.subtitle}>Shared with your partner</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.option} onPress={handleSync}>
          <Text style={styles.optionText}>Sync Data</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>App Settings</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>About AdiDo</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 12,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    borderColor: '#ddd',
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  arrow: {
    fontSize: 18,
    color: '#007AFF',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;