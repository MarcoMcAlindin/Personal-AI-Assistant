---
name: expo-push-notifications
description: Implements push notifications via Expo Push API for new email alerts. No Firebase needed - uses Expo's native push service.
agent: Blue, Green
---

# Skill: Expo Push Notifications

## Architecture
- Mobile registers for push token via `expo-notifications`
- Mobile POSTs token to backend `POST /users/push-token`
- Backend stores token in `users.settings.push_tokens []` (JSONB array)
- Backend sends notifications via Expo Push HTTP API using existing `httpx`

## Mobile Setup (React Native / Expo)

### 1. Install Package
```bash
cd mobile && npx expo install expo-notifications
```

### 2. Register Token on App Start (add to App.js / root layout)
```javascript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications display when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(apiPost) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('email', {
      name: 'Email Notifications',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data; // "ExponentPushToken[...]"

  // Send to backend
  await apiPost('/users/push-token', { token: pushToken });
}
```

### 3. Handle Notification Taps (navigate to email)
```javascript
import { useNotificationResponse } from 'expo-notifications';

// In root component:
const response = Notifications.useLastNotificationResponse();
useEffect(() => {
  if (response?.notification?.request?.content?.data?.email_id) {
    navigation.navigate('Email', {
      emailId: response.notification.request.content.data.email_id
    });
  }
}, [response]);
```

## Backend Implementation (FastAPI / Green)

### New Endpoint: POST /users/push-token
```python
@router.post("/users/push-token")
async def register_push_token(
    body: PushTokenRequest,
    user_id: str = Depends(get_current_user),
):
    """Store Expo push token for the user."""
    settings = get_user_settings(user_id)
    tokens = settings.get("push_tokens", [])
    if body.token not in tokens:
        tokens.append(body.token)
    supabase.table("users") \
        .update({"settings": {**settings, "push_tokens": tokens}}) \
        .eq("id", user_id).execute()
    return {"registered": True}
```

### Send Push Notification (internal helper)
```python
import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_push_notification(tokens: list[str], title: str, body: str, data: dict = {}):
    """Send push notification to one or more Expo push tokens."""
    if not tokens:
        return
    messages = [
        {"to": token, "title": title, "body": body, "data": data, "sound": "default"}
        for token in tokens
    ]
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={"Content-Type": "application/json"},
        )
```

### Email Polling Endpoint: POST /email/poll (called by a timer/cron)
- Fetch new emails from Gmail (compare against last-seen message ID stored in `users.settings.last_email_id`)
- For each new email matching whitelist or company filter, call `send_push_notification()`
- Update `users.settings.last_email_id` to latest processed ID
- This endpoint is authenticated and should be triggered periodically from the mobile app (background fetch) or a Cloud Scheduler job

## Environment Variables
```
EXPO_ACCESS_TOKEN=...   # Optional - Expo push works without auth for low volume
```

## Notes
- Expo push tokens are device-specific and change on reinstall - always append, never overwrite
- The Expo push service handles routing to APNs (iOS) and FCM (Android) transparently
- No Firebase project setup needed
- Push delivery is best-effort; do not rely on it for critical operations
