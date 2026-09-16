import XCTest

/// Diagnostic only. Finds a way to hand a URL to iOS from the test runner, which is how the emailed
/// sign-in link reaches the phone. `openURL:` is a no-op on modern iOS, so try the pasteboard.
final class SproutTreeDump: XCTestCase {
    func testOpenURLProbe() {
        let app = XCUIApplication()
        app.launch()
        Thread.sleep(forTimeInterval: 3)

        let link = "https://baby.minjae.co/privacy/"
        UIPasteboard.general.string = link
        print("PASTEBOARD SET: \(UIPasteboard.general.string ?? "nil")")

        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        Thread.sleep(forTimeInterval: 4)
        print("SAFARI AFTER ACTIVATE: \(safari.state.rawValue)")

        // what can we address in Safari?
        for (n, q) in [("BUTTON", safari.buttons), ("TEXTFIELD", safari.textFields), ("OTHER", safari.otherElements)] {
            print("--\(n) (\(q.count))")
            for i in 0..<min(q.count, 20) {
                let e = q.element(boundBy: i)
                print("   [\(i)] id=\(e.identifier) label=\(e.label)")
            }
        }

        // the address field, then whatever paste affordance appears
        let addr = safari.textFields["Address"].exists ? safari.textFields["Address"] : safari.buttons["Address"]
        if addr.exists {
            addr.tap()
            Thread.sleep(forTimeInterval: 2.5)
            print("AFTER ADDRESS TAP --BUTTONS (\(safari.buttons.count))")
            for i in 0..<min(safari.buttons.count, 25) { print("   [\(i)] \(safari.buttons.element(boundBy: i).label)") }
            let pasteGo = safari.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Paste'")).firstMatch
            print("PASTE AFFORDANCE: \(pasteGo.exists ? pasteGo.label : "none")")
            if pasteGo.exists {
                pasteGo.tap()
                Thread.sleep(forTimeInterval: 6)
                let allow = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons["Allow Paste"]
                if allow.waitForExistence(timeout: 4) { allow.tap(); Thread.sleep(forTimeInterval: 5) }
                print("SAFARI AFTER PASTE-AND-GO: \(safari.state.rawValue)")
            }
        } else {
            print("NO ADDRESS FIELD")
        }
    }
}
