import XCTest

/// A 15-second product clip for social, not an App Review artefact. Two tests run in order:
/// `testAseed` leaves the app populated (its own recording is thrown away), then `testBhero` walks the
/// best of the product at a deliberate, even pace so the cut needs no rescuing in post. Method names
/// carry the A/B prefix because XCTest runs them alphabetically.
final class SproutHeroUITests: XCTestCase {

    private var app: XCUIApplication!
    override func setUp() { continueAfterFailure = true; app = XCUIApplication() }

    private func beat(_ s: TimeInterval = 1.0) { Thread.sleep(forTimeInterval: s) }
    private func note(_ t: String) { XCTContext.runActivity(named: t) { _ in } }
    private func hit(_ e: XCUIElement) { e.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }

    @discardableResult
    private func tap(_ label: String, timeout: TimeInterval = 10) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            for q in [app.buttons, app.links, app.otherElements, app.staticTexts] {
                let el = q[label]
                if el.exists { hit(el); return true }
            }
            Thread.sleep(forTimeInterval: 0.3)
        } while Date() < deadline
        note("could not tap \(label)")
        return false
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

    @discardableResult
    private func tapWhenOnScreen(_ label: String, tries: Int = 5) -> Bool {
        let h = app.windows.firstMatch.frame.height
        for _ in 0..<tries {
            for q in [app.buttons, app.otherElements] {
                let el = q[label]
                if el.exists { let f = el.frame; if f.height > 0, f.midY > 0, f.midY < h { hit(el); return true } }
            }
            app.swipeUp(); beat(0.5)
        }
        note("could not bring \(label) on screen")
        return false
    }

    /// Populate the app so the hero pass opens on a real, lived-in screen. Discarded recording.
    func testAseed() {
        app.launch()
        beat(4)
        guard app.buttons["Get started"].waitForExistence(timeout: 6) else { note("already seeded"); return }
        tap("English", timeout: 5)
        let name = app.textFields.element(boundBy: 0)
        if name.waitForExistence(timeout: 10) {
            hit(name)
            if app.keyboards.element.waitForExistence(timeout: 8) { beat(0.5); app.typeText("Rowoon") }
        }
        dismissKeyboard()
        if let b = inputBox("Birthday") {
            hit(b)
            let header = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] '2026' OR label CONTAINS[c] '2025'")).firstMatch
            if header.waitForExistence(timeout: 10) {
                let back = app.buttons["Previous Month"]
                var n = 0
                while !app.staticTexts["April 2025"].exists, back.exists, n < 30 { hit(back); n += 1; Thread.sleep(forTimeInterval: 0.2) }
                let day = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'April 17'")).firstMatch
                if day.exists { hit(day) }
                if app.buttons["Done"].exists { app.buttons["Done"].tap() }
            }
        }
        dismissKeyboard()
        tapWhenOnScreen("Get started")
        beat(3)
        // one journal entry so the Journal tab is not an empty state in the clip
        tap("Journal", timeout: 8); beat(1.5)
        if tap("New entry", timeout: 6) || tap("Write the first entry", timeout: 4) {
            beat(1)
            let t = app.textFields.firstMatch
            if t.waitForExistence(timeout: 8) { hit(t); if app.keyboards.element.waitForExistence(timeout: 6) { beat(0.4); app.typeText("First steps") } }
            dismissKeyboard()
            let body = app.textViews.firstMatch
            if body.waitForExistence(timeout: 6) { hit(body); if app.keyboards.element.waitForExistence(timeout: 6) { beat(0.4); app.typeText("She walked across the room today, all on her own.") } }
            dismissKeyboard()
            tapWhenOnScreen("Save")
            beat(2)
        }
    }

    /// The clip. Even ~2.5s beats, no fumbling, ends on Home.
    func testBhero() {
        app.terminate()
        app.launch()
        beat(3.4)                                   // 1. Home, populated

        confirmFirstMilestone()                     // 2. a leaf turns green, the count moves
        beat(2.8)

        tap("Milestones", timeout: 8); beat(2.6)    // 3. the month laid out
        tap("Play", timeout: 8); beat(2.6)          // 4. play ideas, with their source
        tap("Safety", timeout: 8); beat(2.6)        // 5. safety notes, with what to do
        tap("Journal", timeout: 8); beat(2.4)       // 6. the journal
        tap("Home", timeout: 8); beat(1.6)
        app.swipeUp(); beat(2.4)                    // 7. the note for this month
    }

    /// Milestone rows carry the month's own wording, so they cannot be addressed by label. The
    /// "This month" header is fixed, and the first row sits just under it: tap relative to the header.
    private func confirmFirstMilestone() {
        let header = app.staticTexts["This month"]
        guard header.waitForExistence(timeout: 8) else { note("no This month card"); return }
        header.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
              .withOffset(CGVector(dx: 60, dy: 52))
              .tap()
    }
}
