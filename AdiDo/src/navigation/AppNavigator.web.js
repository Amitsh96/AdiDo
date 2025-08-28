import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/AuthService';

import LoginScreen from '../screens/LoginScreen';
import MainScreen from '../screens/MainScreen';

const AppNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Simple navigation logic for web
  if (user) {
    return <MainScreen navigation={{ replace: () => setUser(null) }} />;
  } else {
    return <LoginScreen navigation={{ replace: () => {} }} />;
  }
};

export default AppNavigator;