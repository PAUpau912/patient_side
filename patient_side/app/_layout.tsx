// app/_layout.tsx
import { Stack } from "expo-router";
import { ThemeProvider } from "../ThemeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>

    <Stack
      screenOptions={{
        headerShown: false, // Applies to ALL screens
      }}
    />
    </ThemeProvider>
  );
}
