// ThemeContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeType = "light" | "dark";
type FontSizeType = "small" | "medium" | "large";

type ThemeContextType = {
  theme: ThemeType;
  fontSize: FontSizeType;
  currentUserId: string | null;
  setTheme: (theme: ThemeType) => void;
  setFontSize: (fontSize: FontSizeType) => void;
  setCurrentUserId: (id: string | null) => void;
  loadUserPreferences: (userId: string) => void;
  logout: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeType>("light");
  const [fontSize, setFontSize] = useState<FontSizeType>("small");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ✅ Load preferences whenever user logs in
  const loadUserPreferences = async (userId: string) => {
    try {
      const stored = await AsyncStorage.getItem(`prefs_${userId}`);
      if (stored) {
        const { theme, fontSize } = JSON.parse(stored);
        setTheme(theme || "light");
        setFontSize(fontSize || "small");
      } else {
        // default if no saved prefs yet
        setTheme("light");
        setFontSize("small");
      }
      setCurrentUserId(userId);
    } catch (err) {
      console.error("Failed to load user preferences:", err);
    }
  };

  // ✅ Save preferences whenever theme/fontSize changes
  useEffect(() => {
    const savePreferences = async () => {
      if (currentUserId) {
        try {
          await AsyncStorage.setItem(
            `prefs_${currentUserId}`,
            JSON.stringify({ theme, fontSize })
          );
        } catch (err) {
          console.error("Failed to save preferences:", err);
        }
      }
    };
    savePreferences();
  }, [theme, fontSize, currentUserId]);

  // ✅ Reset on logout
  const logout = async () => {
    setCurrentUserId(null);
    setTheme("light");
    setFontSize("small");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        fontSize,
        currentUserId,
        setTheme,
        setFontSize,
        setCurrentUserId,
        loadUserPreferences,
        logout,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
};
