// Native module with no JS-only fallback; use the package's own official
// jest mock so tests never hit a real native bridge call.
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock'));
