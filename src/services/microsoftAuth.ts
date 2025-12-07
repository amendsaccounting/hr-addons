import { authorize } from 'react-native-app-auth';

export const microsoftConfig = {
  clientId: 'ea201671-6786-4d84-9385-0b2c9db9a7bf',
  redirectUrl: 'msauth://com.hr_addons',
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  usePKCE: true,
  useWebKit: true,
  additionalParameters: { prompt: 'select_account' },
  serviceConfiguration: {
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  },
};

// // Optional: a function to handle login
// export async function loginWithMicrosoft() {
//   try {
//     const result = await authorize(microsoftConfig);
//     return result; // contains accessToken, idToken, etc.
//   } catch (err) {
//     console.log('Microsoft login error:', err);
//     throw err;
//   }
// }

export async function loginWithMicrosoft() {
  try {
    const result = await authorize(microsoftConfig);
    console.log('Microsoft login result:', result);
    // Optional: destructure and log individual tokens
    const { accessToken, accessTokenExpirationDate, idToken, refreshToken } = result;
    console.log('Access Token:', accessToken);
    console.log('Access Token Expiry:', accessTokenExpirationDate);
    console.log('ID Token:', idToken);
    console.log('Refresh Token:', refreshToken);

    return result;
  } catch (err) {
    console.log('Microsoft login error:', err);
    throw err;
  }
}