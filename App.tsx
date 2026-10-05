import React from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { LangProvider, useT } from "./src/lib/i18n";
import type { RootStackParamList } from "./src/navigation";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import StartDayScreen from "./src/screens/StartDayScreen";
import RecordProjectScreen from "./src/screens/RecordProjectScreen";
import MyRecordsScreen from "./src/screens/MyRecordsScreen";
import LeaveRequestScreen from "./src/screens/LeaveRequestScreen";
import LeaveHistoryScreen from "./src/screens/LeaveHistoryScreen";
import PettyCashScreen from "./src/screens/PettyCashScreen";
import PettyCashHistoryScreen from "./src/screens/PettyCashHistoryScreen";
import PettyCashEditScreen from "./src/screens/PettyCashEditScreen";
import { colors } from "./src/lib/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

function Root() {
  const { loading, signedIn } = useAuth();
  const { t } = useT();
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
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "JIA Staff", headerBackVisible: false }} />
      <Stack.Screen name="StartDay" component={StartDayScreen} options={{ title: t("startMyDay") }} />
      <Stack.Screen name="RecordProject" component={RecordProjectScreen} options={{ title: t("recordProject") }} />
      <Stack.Screen name="MyRecords" component={MyRecordsScreen} options={{ title: t("myRecords") }} />
      <Stack.Screen name="LeaveRequest" component={LeaveRequestScreen} options={{ title: t("leaveRequest") }} />
      <Stack.Screen name="LeaveHistory" component={LeaveHistoryScreen} options={{ title: t("leaveHistory") }} />
      <Stack.Screen name="PettyCash" component={PettyCashScreen} options={{ title: t("pettyCash") }} />
      <Stack.Screen name="PettyCashHistory" component={PettyCashHistoryScreen} options={{ title: t("pcHistory") }} />
      <Stack.Screen name="PettyCashEdit" component={PettyCashEditScreen} options={{ title: t("pcEdit") }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <NavigationContainer>
          <Root />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </LangProvider>
  );
}
