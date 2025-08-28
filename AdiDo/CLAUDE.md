# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdiDo is a React Native app for shared todo lists and grocery lists with Firebase backend. The project supports multiple platforms: iOS, Android, and Web using React Native Web.

## Development Commands

### Running the Application
- `npm start` - Start Metro bundler for React Native
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator (requires CocoaPods setup)
- `npm run web` - Run web version using webpack dev server on port 3000
- `npm run build:web` - Build production web bundle

### iOS Setup Requirements
Before running iOS:
```bash
bundle install          # Install Ruby bundler (first time only)
bundle exec pod install # Install CocoaPods dependencies
```

### Testing and Code Quality
- `npm test` - Run Jest tests
- `npm run lint` - Run ESLint

## Architecture

### Project Structure
- `src/navigation/` - React Navigation stack navigator setup
- `src/screens/` - Main application screens (Login, Main, TodoList, GroceryList, Events, Profile)
- `src/services/` - Firebase integration and data services
- `src/components/` - Reusable React Native components
- `src/utils/` - Utility functions

### Key Architecture Patterns
- **Navigation**: Uses React Navigation v6 with stack navigator
- **Authentication**: Firebase Auth with login flow
- **Data Storage**: Firestore for real-time data synchronization
- **Cross-platform**: React Native with platform-specific entry points (index.js, index.web.js, App.web.js)

### Firebase Configuration
Firebase is configured in `src/services/FirebaseConfig.js` with Firestore and Auth services. The project ID is "adido-3155".

### Platform Support
- **Mobile**: Standard React Native (iOS/Android)
- **Web**: Uses react-native-web with webpack configuration
- **Entry Points**: 
  - Mobile: `index.js` → `App.tsx`
  - Web: `index.web.js` → `App.web.js`

### TypeScript Configuration
- Uses `@react-native/typescript-config` as base
- Includes all `.ts` and `.tsx` files
- Excludes `node_modules` and iOS `Pods` directory

## Testing Framework
- Jest with React Native preset
- Test files in `__tests__/` directory
- React Test Renderer for component testing