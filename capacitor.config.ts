import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.minjae.sprout",
  appName: "Sprout",
  webDir: ".next-native",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#FAF6EE",
    preferredContentMode: "mobile",
    scheme: "Sprout",
  },
  plugins: {
    LocalNotifications: {
      presentationOptions: ["banner", "sound"],
    },
  },
};

export default config;
