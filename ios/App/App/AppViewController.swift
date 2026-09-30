import UIKit
import Capacitor

/// The Capacitor host with the app's own native plugin registered.
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SproutPushPlugin())
    }
}
