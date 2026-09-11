export const centralApiOrigin = process.env.EXPO_PUBLIC_PRODEX_API_ORIGIN?.trim().replace(/\/$/, '') || 'https://prodexhub.cloud';

export const authConfig = {
  centralApiOrigin,
  requestTimeoutMs: 15000,
} as const;