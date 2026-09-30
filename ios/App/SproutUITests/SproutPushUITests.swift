import XCTest

/// Notes from Sprout (remote notifications) on a simulator. Run with scripts/ios/run-push-sim.sh, one method per
/// fresh install, in this order:
///   testQuietByDefault   fresh install → onboarding: no system prompt at launch (quiet, provisional), the reminders
///                        card still offers the one prompt → Allow → Settings shows both switches on
///   testTapOpensNote     (same install, alerts allowed) the app goes to the background; the script sends a REAL
///                        sandbox push through the admin API that opens /settings/; tapping the banner opens Settings
/// Screenshots are kept as attachments and written to /tmp/sprout-push/.
final class SproutPushUITests: XCTestCase {

    private var app: XCUIApplication!
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    override func setUp() { continueAfterFailure = false; app = XCUIApplication() }

    private func beat(_ s: TimeInterval = 0.8) { Thread.sleep(forTimeInterval: s) }
    private func hit(_ e: XCUIElement) { e.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }

    private func find(_ label: String, timeout: TimeInterval = 12) -> XCUIElement? {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            for q in [app.buttons, app.links, app.otherElements, app.staticTexts, app.switches] {
                let el = q[label]
                if el.exists { return el }
            }
            Thread.sleep(forTimeInterval: 0.3)
        } while Date() < deadline
        return nil
    }

    private func tap(_ label: String, timeout: TimeInterval = 12) {
        guard let el = find(label, timeout: timeout) else { return XCTFail("could not find \(label)") }
        hit(el); beat()
    }

    private func shot(_ name: String) {
        let png = XCUIScreen.main.screenshot().pngRepresentation
        let a = XCTAttachment(data: png, uniformTypeIdentifier: "public.png")
        a.name = name; a.lifetime = .keepAlways; add(a)
        let dir = URL(fileURLWithPath: "/tmp/sprout-push")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? png.write(to: dir.appendingPathComponent("\(name).png"))
    }

    private func inputBox(_ label: String) -> XCUIElement? {
        let q = app.otherElements.matching(NSPredicate(format: "label == %@", label))
        var best: XCUIElement?
        for i in 0..<q.count { let e = q.element(boundBy: i); if e.exists, e.frame.height > 40 { best = e } }
        return best
    }

    private func dismissKeyboard() {
        guard app.keyboards.element.exists else { return }
        for c in [app.buttons["Done"], app.keyboards.buttons["Done"], app.keyboards.buttons["return"]] {
            if c.exists { c.tap(); beat(0.5); return }
        }
    }

    private var anySystemAlert: Bool { springboard.alerts.firstMatch.exists }

    private func onboard() {
        app.launch()
        tap("English", timeout: 20)
        let name = app.textFields.element(boundBy: 0)
        XCTAssertTrue(name.waitForExistence(timeout: 12))
        hit(name)
        XCTAssertTrue(app.keyboards.element.waitForExistence(timeout: 8))
        app.typeText("Rowoon")
        dismissKeyboard()
        guard let box = inputBox("Birthday") else { return XCTFail("no birthday field") }
        hit(box)
        let back = app.buttons["Previous Month"]
        XCTAssertTrue(back.waitForExistence(timeout: 10))
        var rail = 0
        while !app.staticTexts["April 2025"].exists, rail < 30 { hit(back); rail += 1; Thread.sleep(forTimeInterval: 0.25) }
        let day = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'April 17'")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 5)); hit(day); beat()
        if app.buttons["Done"].exists { app.buttons["Done"].tap(); beat() }
        tap("Get started")
    }

    func testQuietByDefault() {
        onboard()
        // quiet authorization never prompts: nothing on screen but the app
        beat(3)
        XCTAssertFalse(anySystemAlert, "no system prompt at launch")
        let card = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Get a note when Rowoon turns'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 15), "the reminders card still asks (quiet delivery is not a yes)")
        shot("push-1-card")
        tap("Turn on reminders")
        let allow = springboard.buttons["Allow"]
        XCTAssertTrue(allow.waitForExistence(timeout: 6), "the one system prompt comes from the card")
        shot("push-2-prompt")
        allow.tap(); beat(1.2)
        tap("Settings")
        XCTAssertNotNil(find("Notes from Sprout", timeout: 10), "Settings shows the Notes from Sprout switch")
        let notes = app.switches["Notes from Sprout"]
        XCTAssertTrue(notes.waitForExistence(timeout: 5))
        XCTAssertEqual(notes.value as? String, "1", "on by default")
        shot("push-3-settings")
    }

    func testTapOpensNote() {
        app.launch()
        beat(3)
        tap("Home", timeout: 10)
        XCUIDevice.shared.press(.home)
        // the script sends the push ~75 s after the test run starts (build included)
        let banner = springboard.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'Sprout admin tap test'")).firstMatch
        let found = banner.waitForExistence(timeout: 200)
        shot("push-4-banner")
        XCTAssertTrue(found, "the banner arrived")
        banner.tap()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        XCTAssertNotNil(find("Notes from Sprout", timeout: 12), "the tap opened Settings (/settings/)")
        shot("push-5-opened")
    }
}
