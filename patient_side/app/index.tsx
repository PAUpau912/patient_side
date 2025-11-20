import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Wait until router is ready
    const timeout = setTimeout(() => {
      router.replace('../screens/start'); // Or your login screen
    }, 100); // Delay a little to allow RootLayout to load

    return () => clearTimeout(timeout);
  }, []);

  return null;
}
