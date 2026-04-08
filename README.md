# Toki — Social Proximity App

Мобильное приложение для знакомств и общения с людьми в радиусе **100 метров**.

## Стек

| Слой | Технология |
|------|-----------|
| Бэкенд | **C# ASP.NET Core 8** |
| БД | **MongoDB** (Atlas или self-hosted) |
| Реалтайм | **SignalR** (WebSocket) |
| Мобильное | **Expo (React Native)** — iOS + Android |
| Авторизация | **JWT + Google OAuth + Apple Sign In** |
| Иконки | **react-native-svg** (все SVG inline) |
| Состояние | **Zustand** |

---

## Структура проекта

```
omni/
├── Toki.sln
├── src/
│   └── Toki.Api/              ← ASP.NET Core 8 API
│       ├── Controllers/       ← Auth, Proximity, Messages, Gifts, AdminGifts
│       ├── Hubs/              ← ChatHub, CallHub (SignalR)
│       ├── Models/            ← User, Gift, GiftPurchase, ChatMessage
│       ├── Services/          ← JwtTokenService, AppleIdTokenValidator
│       ├── Options/           ← Strongly-typed config sections
│       ├── Infrastructure/    ← MongoIndexesHostedService (2dsphere index)
│       └── Program.cs
└── mobile/                    ← Expo app
    ├── App.tsx                ← Root (auth guard + NavigationContainer)
    ├── app.json               ← Expo config (iOS/Android perms, plugins)
    └── src/
        ├── api/client.ts      ← Typed fetch helpers + SecureStore token
        ├── config.ts          ← API_BASE_URL
        ├── theme.ts           ← Colors, radii
        ├── store/             ← useAuthStore (Zustand)
        ├── hooks/             ← useSignalR
        ├── components/        ← TokiLogo (SVG)
        ├── navigation/        ← RootNavigator (Stack) + TabNavigator (Bottom tabs)
        └── screens/
            ├── AuthScreen.tsx      ← Google / Apple login
            ├── NearbyScreen.tsx    ← Discovery: поиск + список рядом
            ├── ChatScreen.tsx      ← Зашифрованный чат (SignalR)
            ├── CallScreen.tsx      ← Аудио/видео звонок (SignalR signaling)
            ├── GiftsScreen.tsx     ← Магазин подарков
            └── ProfileScreen.tsx   ← Профиль + выход
```

---

## Быстрый старт

### 1. MongoDB

Создайте бесплатный кластер на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) или запустите локально:

```bash
# Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 2. Бэкенд (ASP.NET Core 8)

```bash
# Убедитесь, что установлен .NET 8 SDK
dotnet --version

# Из корня проекта
cd src/Toki.Api
```

Откройте `appsettings.Development.json` и заполните:

```json
{
  "MongoDb": {
    "ConnectionString": "mongodb+srv://user:pass@cluster.mongodb.net",
    "DatabaseName": "toki_dev"
  },
  "Jwt": {
    "SigningKey": "min-32-characters-random-secret-here!!"
  },
  "Google": {
    "ClientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
  },
  "Apple": {
    "ClientId": "com.yourcompany.toki"
  },
  "Admin": {
    "ApiKey": "your-admin-key"
  }
}
```

```bash
dotnet run --project src/Toki.Api
# Swagger → http://localhost:5094/swagger
# Health  → http://localhost:5094/health
```

### 3. Google OAuth Client ID

1. [Google Cloud Console](https://console.cloud.google.com/) → Credentials
2. Создайте **OAuth 2.0 Client ID** типа **Web application**
3. Authorized redirect URIs: `https://auth.expo.io/@yourexpouser/toki`
4. Client ID → `appsettings.Development.json` и в `AuthScreen.tsx` (`GOOGLE_CLIENT_ID`)

### 4. Мобильное приложение (Expo)

```bash
cd mobile

# Если на телефоне (Expo Go) — укажите LAN-IP машины:
# Откройте src/config.ts и замените localhost на IP

npx expo start
# Сканируйте QR-код Expo Go (Android) или используйте Simulator (iOS)
```

**Зависимости уже установлены.** Если нет:

```bash
npm install
npx expo install
```

---

## API эндпоинты

### Auth
| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/api/auth/google` | Вход через Google (id_token) |
| POST | `/api/auth/apple` | Вход через Apple (identity_token) |

### Proximity
| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/api/proximity/state` | Установить координаты + режим поиска |
| GET | `/api/proximity/nearby?lat=&lon=` | Список людей в 100 м |

### Messages
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/api/messages/conversation-id/{userId}` | Deterministic ID беседы |
| GET | `/api/messages/conversation/{convId}` | История (зашифрованные ciphertext) |

### Gifts
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/api/gifts` | Список активных подарков |
| POST | `/api/gifts/{id}/order` | Заказать подарок |

### Admin (заголовок `X-Admin-Key`)
| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/api/admin/AdminGifts` | Создать подарок (с SVG) |
| PUT | `/api/admin/AdminGifts/{id}` | Обновить |
| DELETE | `/api/admin/AdminGifts/{id}` | Удалить |

### SignalR Hubs
| Hub | URL | Описание |
|-----|-----|---------|
| Chat | `/hubs/chat` | `JoinConversation`, `SendCipher` → `ReceiveCipher` |
| Call | `/hubs/call` | `SendOffer`, `SendAnswer`, `SendIceCandidate`, `NotifyCallEnded` |

---

## Добавление подарка через Admin API

```bash
curl -X POST http://localhost:5094/api/admin/AdminGifts \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: dev-admin-key-change" \
  -d '{
    "name": "Роза",
    "description": "Красивая роза для симпатичного человека",
    "priceUsd": 1.99,
    "isActive": true,
    "svgIconMarkup": "<svg viewBox=\"0 0 24 24\"><path d=\"M12 2C8 8 4 10 4 14a8 8 0 0016 0c0-4-4-6-8-12z\" fill=\"#ff6b8a\"/></svg>"
  }'
```

---

## Дальнейшие шаги

### Монетизация подарков
- **Stripe**: используйте `Stripe.net` в `GiftsController.Order` для создания Payment Intent
- **Apple IAP / Google Play Billing**: верификация чеков в контроллере

### Реальный E2E-чат
Замените XOR-заглушку в `ChatScreen.tsx` на **libsodium.js** (`tweetnacl` для RN):
```bash
npm install tweetnacl tweetnacl-util
```

### Реальный WebRTC
```bash
npx expo install expo-camera @daily-co/react-native-daily-js
# или react-native-webrtc
```

### Деплой
- **API**: Azure App Service / Railway / Fly.io (Docker: `dotnet publish` + `FROM mcr.microsoft.com/dotnet/aspnet:8.0`)
- **Мобильное**: `eas build` + `eas submit` (EAS = Expo Application Services)

```bash
npm install -g eas-cli
eas build --platform all
```

---

## Переменные среды (продакшн)

Вместо `appsettings.json` используйте переменные окружения (стандарт ASP.NET Core):

```
MongoDb__ConnectionString=mongodb+srv://...
Jwt__SigningKey=...
Google__ClientId=...
Apple__ClientId=...
Admin__ApiKey=...
```
