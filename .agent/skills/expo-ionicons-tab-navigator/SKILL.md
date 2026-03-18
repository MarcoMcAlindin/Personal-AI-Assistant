---
name: expo-ionicons-tab-navigator
description: Replaces system emoji in React Native bottom tab navigators with @expo/vector-icons Ionicons, matching the VibeOS ground truth Figma design. Covers icon pairing, active dot indicators, and palette compliance.
---

# Expo Ionicons Tab Navigator

## When to use this skill

- When any tab bar screen uses emoji text (`<Text>`) as tab icons instead of a vector icon library
- When the bottom tab bar does not match the `docs/assets/ui_ground_truth/` reference images
- When adding a new screen to the tab navigator in `mobile/src/navigation/TabNavigator.jsx`

## Why System Emoji Are Wrong

React Native renders emoji using the OS font. On Android:
- The calendar emoji (`📅`) renders as a colourful tile with the current date ("JUL 17")
- The heart (`❤️`) renders as a bright pink filled shape
- Emoji are not tintable — `color` prop has no effect

Ionicons are vector SVGs — they respect `color`, `size`, and can be swapped between filled (active) and outline (inactive) variants.

## Icon Map (VibeOS Tabs)

| Tab | Inactive (outline) | Active (filled) | Ground truth reference |
|-----|--------------------|-----------------|-----------------------|
| Plan | `calendar-outline` | `calendar` | `mobile_planner_v1.png` |
| Feeds | `newspaper-outline` | `newspaper` | `mobile_planner_v1.png` |
| AI | `chatbubble-outline` | `chatbubble` | `mobile_chat_v1.png` |
| Mail | `mail-outline` | `mail` | `mobile_email_v1.png` |
| Health | `heart-outline` | `heart` | `mobile_health_v1.png` |

## Implementation

### 1. Import

```jsx
import { Ionicons } from '@expo/vector-icons';
// No npm install needed -- included in Expo SDK (host.exp.exponent)
```

### 2. Replace tabIcon helper

**Before (broken):**
```jsx
const tabIcon = (label) => ({ focused }) => (
  <Text style={{ fontSize: 20, color: focused ? palette.accentPrimary : palette.textMuted }}>
    {label}
  </Text>
);
```

**After (correct):**
```jsx
const tabIcon = (name) => ({ focused, color }) => (
  <Ionicons
    name={focused ? name : `${name}-outline`}
    size={22}
    color={color}
  />
);
```

Note: `color` is automatically set by `tabBarActiveTintColor` / `tabBarInactiveTintColor` — no need to reference palette directly in the icon component.

### 3. Tab definitions

```jsx
<Tab.Screen
  name="Plan"
  component={PlannerScreen}
  options={{ tabBarIcon: tabIcon('calendar') }}
/>
<Tab.Screen
  name="Feeds"
  component={FeedsScreen}
  options={{ tabBarIcon: tabIcon('newspaper') }}
/>
<Tab.Screen
  name="AI"
  component={ChatScreen}
  options={{ tabBarIcon: tabIcon('chatbubble') }}
/>
<Tab.Screen
  name="Mail"
  component={EmailScreen}
  options={{ tabBarIcon: tabIcon('mail') }}
/>
<Tab.Screen
  name="Health"
  component={HealthScreen}
  options={{ tabBarIcon: tabIcon('heart') }}
/>
```

### 4. Active dot indicator

The ground truth shows a small cyan dot **below the active tab label**. Implement via a custom `tabBarLabel`:

```jsx
const tabLabel = (label) => ({ focused }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{
      fontSize: 10,
      color: focused ? palette.accentPrimary : palette.textMuted,
      marginTop: 2,
    }}>
      {label}
    </Text>
    {focused && (
      <View style={{
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: palette.accentPrimary,
        marginTop: 2,
      }} />
    )}
  </View>
);
```

Then in each `Tab.Screen options`:
```jsx
options={{
  tabBarIcon: tabIcon('calendar'),
  tabBarLabel: tabLabel('Plan'),
}}
```

### 5. screenOptions adjustments

Remove `tabBarLabelStyle` from `screenOptions` since label rendering is now handled by the custom component:

```jsx
screenOptions={{
  headerShown: false,
  tabBarStyle: {
    backgroundColor: '#000000',
    borderTopColor: palette.borderColor,
    borderTopWidth: 1,
    height: 65,
    paddingBottom: 10,
    paddingTop: 6,
  },
  tabBarActiveTintColor: palette.accentPrimary,
  tabBarInactiveTintColor: palette.textMuted,
  // Remove tabBarLabelStyle -- handled by custom tabBarLabel
}}
```

## Visual Acceptance Checklist

- [ ] All 5 icons are monochrome outline vectors (no emoji)
- [ ] Active icon is the filled variant in `#00D4FF`
- [ ] Inactive icons are outline variant in `#71717A`
- [ ] Small cyan dot appears below active tab label
- [ ] Tab bar background is `#000000` (OLED black)
- [ ] Matches `docs/assets/ui_ground_truth/mobile_planner_v1.png` — check Plan tab active state

## Forbidden Patterns

- **Do NOT use `@react-native-vector-icons`** — requires native linking. Ionicons from `@expo/vector-icons` is already in the Expo SDK.
- **Do NOT hardcode `color`** inside `tabBarIcon` — the navigator passes `color` automatically from `tabBarActiveTintColor` / `tabBarInactiveTintColor`.
- **Do NOT use emoji as fallback** — if an Ionicon doesn't exist, pick the closest available icon from the Ionicons set.
