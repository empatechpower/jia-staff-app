import React from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./src/lib/auth";
import type { RootStackParamList } from "./src/navigation";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import StartDayScreen from "./src/screens/StartDayScreen";
import RecordProjectScreen from "./src/screens/RecordProjectScreen";
import { colors } from "./src/lib/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

function Root() {
  const { loading, signedIn } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!signedIn) return <LoginScreen />;
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "JIA Staff" }} />
      <Stack.Screen name="StartDay" component={StartDayScreen} options={{ title: "Start My Day" }} />
      <Stack.Screen name="RecordProject" component={RecordProjectScreen} options={{ title: "Project Attendance" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
        <StatusBar style="dark" />
      </NavigationContainer>
    </AuthProvider>
  );
}
