import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.minjae.dodam",
  appName: "Dodam",
  webDir: "out",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#FAF6EE",
    preferredContentMode: "mobile",
    scheme: "Dodam",
  },
  plugins: {
    LocalNotifications: {
      presentationOptions: ["banner", "sound"],
    },
  },
};

export default config;
