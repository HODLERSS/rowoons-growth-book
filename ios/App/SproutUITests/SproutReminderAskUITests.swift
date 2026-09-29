import XCTest

/// The reminder soft ask on a fresh install: onboarding, then the Home card that explains reminders
/// before iOS shows its one-time prompt. Run one method per fresh install (the prompt never returns):
///   testAllow  card → Turn on reminders → Allow → card gone, Settings switch on
///   testDeny   card → Turn on reminders → Don't Allow → the Settings › Notifications guidance
///   testCard   stops at the card (for the dark-mode screenshot)
/// Screenshots are kept as attachments and also written to /tmp/sprout-reminder-ask/.
final class SproutReminderAskUITests: XCTestCase {

    private var app: XCUIApplication!
    override func setUp() { continueAfterFailure = false; app = XCUIApplication() }

    private func beat(_ s: TimeInterval = 0.8) { Thread.sleep(forTimeInterval: s) }
    private func hit(_ e: XCUIElement) { e.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }

    private func find(_ label: String, timeout: TimeInterval = 12) -> XCUIElement? {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            for q in [app.buttons, app.links, app.otherElements, app.staticTexts] {
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
        let dir = URL(fileURLWithPath: "/tmp/sprout-reminder-ask")
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

    /// Name, then the calendar popover walked back to April 2025 (the owner's fixture birthday).
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

    private var card: XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Get a note when Rowoon turns'")).firstMatch
    }

    private func systemAlert(_ labels: [String]) {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for l in labels where springboard.buttons[l].waitForExistence(timeout: 4) { springboard.buttons[l].tap(); beat(1.2); return }
        XCTFail("no system alert with \(labels)")
    }

    func testCard() {
        onboard()
        XCTAssertTrue(card.waitForExistence(timeout: 15), "the reminder card is on Home after the first profile save")
        beat(1.2)
        shot("card")
    }

    func testAllow() {
        testCard()
        tap("Turn on reminders")
        shot("ios-prompt")
        systemAlert(["Allow"])
        XCTAssertTrue(card.waitForNonExistence(timeout: 10), "the card goes away once reminders are on")
        shot("after-allow")
        tap("Settings")
        let toggle = app.switches.firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        XCTAssertEqual(toggle.value as? String, "1", "Settings shows reminders on")
        shot("settings-on")
        // Relaunch: the card must not come back.
        app.terminate(); app.launch()
        XCTAssertNotNil(find("Edit profile", timeout: 5) ?? app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Edit profile'")).firstMatch)
        beat(2)
        XCTAssertFalse(card.exists)
    }

    func testDeny() {
        testCard()
        tap("Turn on reminders")
        systemAlert(["Don’t Allow", "Don't Allow"])
        XCTAssertNotNil(find("Reminders are off", timeout: 10), "the refusal guidance shows")
        shot("after-deny")
        tap("OK")
        XCTAssertNil(find("Reminders are off", timeout: 2))
        app.terminate(); app.launch()
        beat(3)
        XCTAssertFalse(card.exists, "no card after a refusal")
    }
}
