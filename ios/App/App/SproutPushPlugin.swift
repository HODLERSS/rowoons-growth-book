import UIKit
import Capacitor
import UserNotifications

/// Notes from Sprout (remote notifications), registered by AppViewController. The web side reaches it through
/// `src/lib/remote-push.ts`; every call there is a no-op in the browser.
///
///  - status: the app-wide notification authorization, including "provisional", which Capacitor's plugins report
///    as "granted" (so the reminders code could not tell quiet delivery from alerts the parent allowed).
///  - requestQuiet: PROVISIONAL authorization, which never shows a prompt; notes land quietly in Notification
///    Center until the parent keeps them. The one system prompt stays with the reminders card and Settings.
///  - apnsEnvironment: which APNs host issued this build's token, so the server sends each token to its own host.
@objc(SproutPushPlugin)
public class SproutPushPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SproutPushPlugin"
    public let jsName = "SproutPush"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestQuiet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "apnsEnvironment", returnType: CAPPluginReturnPromise)
    ]

    static func name(of status: UNAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .denied: return "denied"
        case .authorized: return "authorized"
        case .provisional: return "provisional"
        case .ephemeral: return "ephemeral"
        @unknown default: return "notDetermined"
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            call.resolve(["status": Self.name(of: settings.authorizationStatus)])
        }
    }

    /// Only ever asks while undetermined; from any other state it just reports it.
    @objc func requestQuiet(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else {
                call.resolve(["status": Self.name(of: settings.authorizationStatus)])
                return
            }
            center.requestAuthorization(options: [.alert, .sound, .badge, .provisional]) { _, _ in
                center.getNotificationSettings { after in
                    call.resolve(["status": Self.name(of: after.authorizationStatus)])
                }
            }
        }
    }

    /// The simulator and builds signed with a development profile (Xcode runs) register with the APNs sandbox;
    /// TestFlight and App Store builds, which carry a distribution profile or none, with production.
    static func apnsEnvironment() -> String {
        #if targetEnvironment(simulator)
        return "sandbox"
        #else
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .isoLatin1),
              let start = text.range(of: "<plist"), let end = text.range(of: "</plist>") else { return "production" }
        let plist = String(text[start.lowerBound..<end.upperBound])
        guard let pdata = plist.data(using: .isoLatin1),
              let dict = try? PropertyListSerialization.propertyList(from: pdata, format: nil) as? [String: Any],
              let ents = dict["Entitlements"] as? [String: Any],
              let aps = ents["aps-environment"] as? String else { return "production" }
        return aps == "development" ? "sandbox" : "production"
        #endif
    }

    @objc func apnsEnvironment(_ call: CAPPluginCall) {
        call.resolve(["environment": Self.apnsEnvironment()])
    }
}
