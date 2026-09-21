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

    /// The clip. Every beat carries motion — a drag or a tap that visibly changes state — because a
    /// sequence of held screens reads as a slideshow of screenshots rather than someone using the app.
    func testBhero() {
        app.terminate()
        app.launch()
        beat(1.6)

        // 1. Home, read the way a person reads it: down through the cards and back up.
        scroll(.up, 0.55); beat(0.5)
        scroll(.up, 0.50); beat(0.9)
        scroll(.down, 0.55); beat(0.4)
        scroll(.down, 0.55); beat(0.9)

        // 2. Two milestones confirmed, so the counter and the bar move twice rather than once.
        confirmMilestone(row: 0); beat(1.3)
        confirmMilestone(row: 0); beat(1.5)

        // 3. Milestones, scrolled through the categories.
        tap("Milestones", timeout: 8); beat(1.1)
        scroll(.up, 0.55); beat(1.1)

        // 4. Play.
        tap("Play", timeout: 8); beat(1.0)
        scroll(.up, 0.55); beat(1.1)

        // 5. Safety.
        tap("Safety", timeout: 8); beat(1.0)
        scroll(.up, 0.50); beat(1.1)

        // 6. Journal. The entry is not opened: the entry view has no tab bar and no back control this
        // test can address by label, which stranded every beat after it.
        tap("Journal", timeout: 8); beat(1.4)
        scroll(.up, 0.35); beat(0.9)

        // 7. Korean, reached the way a user would. The gear lives in the Home header, so go there first.
        tap("Home", timeout: 8); beat(0.7)
        tap("Settings", timeout: 8); beat(1.2)
        tap("한국어", timeout: 8); beat(1.6)
        tap("홈", timeout: 8); beat(1.6)
        scroll(.up, 0.45); beat(1.4)
    }

    private enum Dir { case up, down }

    /// A press-and-drag, not swipeUp(): swipe is a flick that blurs past the content, while a drag at
    /// this speed reads like a thumb and leaves the text legible the whole way.
    private func scroll(_ dir: Dir, _ amount: CGFloat) {
        let fromY: CGFloat = dir == .up ? 0.72 : 0.30
        let toY: CGFloat = dir == .up ? 0.72 - amount : 0.30 + amount
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: fromY))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: toY))
        start.press(forDuration: 0.08, thenDragTo: end)
    }

    /// Milestone rows carry the month's own wording, so they cannot be addressed by label. The
    /// "This month" header is fixed and the rows sit under it at a regular pitch.
    private func confirmMilestone(row: Int) {
        let header = app.staticTexts["This month"]
        guard header.waitForExistence(timeout: 8) else { note("no This month card"); return }
        header.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
              .withOffset(CGVector(dx: 60, dy: 52 + CGFloat(row) * 44))
              .tap()
    }

    private func tapFirstJournalEntry() {
        let entry = app.buttons.matching(NSPredicate(format: """
            NOT (label IN {'Home','Milestones','Play','Safety','Journal','New entry','Settings','Back'})
            """)).firstMatch
        if entry.waitForExistence(timeout: 6) { hit(entry) } else { note("no journal entry to open") }
    }
}
