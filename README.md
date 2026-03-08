# BoulderBuddy

A mobile app that analyzes indoor bouldering routes. Take a photo of a climbing wall, select the hold color, and get move-by-move climbing suggestions (beta) adjusted for your height.

Built for parents and kids to use together at the climbing gym.

## Features

- **Hold detection** - On-device color-based detection of climbing holds (HSV filtering, no internet required)
- **Beta suggestions** - Move-by-move climbing sequences based on detected holds and climber height
- **Two profiles** - Switch between parent and child with different height/reach calculations
- **Gamification** - XP, levels, achievements, streaks, and encouraging messages to keep kids motivated

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- A physical Android or iOS device
- [Expo Go](https://expo.dev/go) app installed on your phone (free on Play Store / App Store)

## Install and run on your phone

1. **Clone the repo**

   ```bash
   git clone https://github.com/shpitzs/boulder-buddy.git
   cd boulder-buddy
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the dev server**

   ```bash
   npx expo start
   ```

4. **Open on your phone**

   - Open the **Expo Go** app on your Android/iOS device
   - Scan the QR code shown in your terminal
   - The app will load on your phone over your local network

   > Make sure your phone and computer are on the same Wi-Fi network.

## First-time setup in the app

1. You'll see the welcome screen - tap **Create Profile**
2. Enter a name and height (in cm) for each climber
3. Go back to the **Climb** tab, select a difficulty, and tap **Take a Photo**
4. Point your camera at a bouldering wall and capture
5. Select the hold color (or tap directly on a hold to sample its color)
6. The app will detect holds and suggest a climbing sequence

## Troubleshooting

| Issue | Fix |
|-------|-----|
| QR code won't scan | Try pressing `s` in the terminal to switch to Expo Go mode, or type the URL manually |
| Camera not working | Make sure you granted camera permissions when prompted |
| "No holds found" | Try tapping directly on a hold in the photo to sample its exact color - gym lighting can shift colors |
| App won't connect | Ensure phone and computer are on the same Wi-Fi. Try `npx expo start --tunnel` as a fallback |

## Tech stack

- React Native + Expo (SDK 54)
- @shopify/react-native-skia (image pixel access)
- expo-camera + expo-image-manipulator
- Zustand + AsyncStorage (state persistence)
- TypeScript
