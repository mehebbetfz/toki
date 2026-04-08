/** На физическом устройстве замените localhost на LAN-IP машины (порт см. launchSettings / dotnet run). */
export const API_BASE_URL = __DEV__
  ? 'http://localhost:5094'
  : 'https://your-api.example.com';
