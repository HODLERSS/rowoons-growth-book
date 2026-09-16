import XCTest

/// The App Review demo walkthrough, driven on a real iPhone. Xcode records the run and that recording
/// is what gets attached to the version and the Resolution Center reply. Beats, in Apple's order:
/// launch -> the product -> account registration -> login -> account deletion.
///
/// Sprout has no password sign-in, and adding one just to make this scriptable would be a product
/// change made for the wrong reason: nothing in the app is gated behind an account. So registration
/// and login run through the app's real email-link flow on a throwaway address. The link itself is
/// fetched off-device and opened by the harness; the test parks on `waitForSignIn` while that happens.
final class SproutDemoUITests: XCTestCase {

    private var app: XCUIApplication!
    private func env(_ key: String) -> String { ProcessInfo.processInfo.environment[key] ?? "" }
    private var rehearsal: Bool { env("REHEARSAL") == "1" }

    override func setUp() {
        continueAfterFailure = true          // a missing beat should not truncate the recording
        app = XCUIApplication()              // the target app: a remote reference cannot receive typed text
    }

    /// A reviewer watches this at normal speed, so every beat has to be readable.
    private func beat(_ seconds: TimeInterval = 1.8) { Thread.sleep(forTimeInterval: seconds) }
    private func note(_ text: String) { XCTContext.runActivity(named: text) { _ in } }

    // MARK: - primitives

    /// WKWebView inputs do not reliably accept typeText on the element itself: tap to focus, wait for
    /// the keyboard, then type through the application.
    @discardableResult
    private func fill(_ field: XCUIElement, _ text: String, _ what: String) -> Bool {
        guard field.waitForExistence(timeout: 15) else { note("MISSING \(what)"); return false }
        field.tap()
        guard app.keyboards.element.waitForExistence(timeout: 8) else { note("no keyboard for \(what)"); return false }
        beat(0.6)
        app.typeText(text)
        beat(0.6)
        return true
    }

    /// The WebView keyboard covers the lower half of a 4.7" screen. Anything tapped underneath it
    /// lands on a key instead of the control, so the keyboard is always dismissed before the next tap.
    private func dismissKeyboard() {
        guard app.keyboards.element.exists else { return }
        for candidate in [app.buttons["Done"], app.keyboards.buttons["Done"], app.keyboards.buttons["return"]] {
            if candidate.exists { candidate.tap(); beat(0.7); return }
        }
        note("could not dismiss the keyboard")
    }

    /// Taps the centre of an element. `isHittable` throws on WebView links ("Activation point invalid"),
    /// which aborts the whole run, so it is never consulted.
    private func hit(_ el: XCUIElement) { el.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }

    @discardableResult
    private func tap(_ label: String, _ what: String? = nil, timeout: TimeInterval = 12) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            for query in [app.buttons, app.links, app.otherElements, app.staticTexts] {
                let el = query[label]
                if el.exists { hit(el); beat(0.8); return true }
            }
            Thread.sleep(forTimeInterval: 0.4)
        } while Date() < deadline
        note("could not tap \(what ?? label)")
        return false
    }

    /// A control below the fold reports a frame outside the window, and tapping its centre lands on
    /// nothing. Scroll until it is genuinely on screen, then tap.
    @discardableResult
    private func tapWhenOnScreen(_ label: String, _ what: String, tries: Int = 5) -> Bool {
        let height = app.windows.firstMatch.frame.height
        for _ in 0..<tries {
            for query in [app.buttons, app.otherElements, app.links] {
                let el = query[label]
                if el.exists {
                    let f = el.frame
                    if f.height > 0, f.midY > 0, f.midY < height { hit(el); beat(0.8); return true }
                }
            }
            app.swipeUp(); beat(0.7)
        }
        note("could not bring \(what) on screen")
        return false
    }

    /// `<input type="date">` is an Other, and the visible caption above it carries the same label, so
    /// take the tall match: the short one is the text.
    private func inputBox(_ label: String) -> XCUIElement? {
        let q = app.otherElements.matching(NSPredicate(format: "label == %@", label))
        var best: XCUIElement?
        for i in 0..<q.count { let e = q.element(boundBy: i); if e.exists, e.frame.height > 40 { best = e } }
        return best
    }

    /// First element in `query` whose label starts with `prefix`, for labels that carry live data
    /// ("Source: CDC", "Rowoon is 16 months old").
    private func first(_ query: XCUIElementQuery, startingWith prefix: String) -> XCUIElement {
        query.matching(NSPredicate(format: "label BEGINSWITH[c] %@", prefix)).firstMatch
    }

    @discardableResult
    private func tapFirst(_ query: XCUIElementQuery, startingWith prefix: String, _ what: String, timeout: TimeInterval = 12) -> Bool {
        let el = first(query, startingWith: prefix)
        guard el.waitForExistence(timeout: timeout) else { note("could not find \(what)"); return false }
        hit(el); beat(0.8)
        return true
    }

    /// System alerts (notification permission) belong to springboard, not to the app.
    @discardableResult
    private func tapSystemAlert(_ labels: [String], timeout: TimeInterval = 8) -> Bool {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for label in labels {
            let b = springboard.buttons[label]
            if b.waitForExistence(timeout: timeout / TimeInterval(labels.count)) { b.tap(); beat(1.0); return true }
        }
        note("no system alert button among \(labels)")
        return false
    }

    /// Apple asks for the recording to begin with launching the app, so it begins where a person
    /// would: on the Home screen, tapping the icon.
    private func launchFromHomeScreen() {
        app.terminate()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        springboard.activate()
        beat(2.5)
        // "SproutUITests-Runner" shares the prefix, so exclude anything with UITest in the label.
        let isSprout = NSPredicate(format: "label BEGINSWITH[c] 'Sprout' AND NOT (label CONTAINS[c] 'UITest')")
        let icon = springboard.icons.matching(isSprout).firstMatch
        // A reinstall drops the icon on a later Home page or into the App Library, where it still
        // matches the query but reports a zero frame. Tapping that fails the run, so check the frame.
        if icon.waitForExistence(timeout: 5), icon.frame.width > 1, icon.frame.height > 1 {
            beat(1.2)
            icon.tap()          // a springboard icon is a native element: tap it, do not aim at coordinates
        } else {
            note("the Sprout icon is not on this Home screen page; launching directly")
        }
        // The icon may sit on another Home screen page, and a missed tap must not cost the whole take.
        if !app.wait(for: .runningForeground, timeout: 15) {
            note("the icon did not launch Sprout; launching directly")
            app.launch()
            _ = app.wait(for: .runningForeground, timeout: 30)
        }
        beat(3.0)
    }

    // MARK: - the walkthrough

    func testDemoWalkthrough() {
        launchFromHomeScreen()
        onboarding()
        home()
        milestonesAndSource()
        playAndSafety()
        journal()
        settingsAndLanguage()
        reminders()
        accountBeats()
        // XCTest stops recording shortly after the last *action*, not the last sleep: end on real taps.
        finish()
    }

    /// Onboarding sheet. The language control and the date input are both exposed as `Other`, not as
    /// a button or a text field, so they are addressed by label rather than by index.
    private func onboarding() {
        note("onboarding")
        _ = tap("English", "the English language option", timeout: 8)
        beat()
        let name = app.textFields.element(boundBy: 0)
        if name.waitForExistence(timeout: 12) {
            hit(name)
            if app.keyboards.element.waitForExistence(timeout: 8) { beat(0.6); app.typeText("Rowoon"); beat(0.6) }
        } else { note("MISSING the baby's name field") }
        dismissKeyboard()                           // the birthday field sits under the keyboard
        birthday()
        dismissKeyboard()
        _ = tapFirst(app.buttons, startingWith: "Born", "the due-date disclosure", timeout: 5)
        beat(1.4)                                   // let the reviewer read the disclaimer line
        // Revealing the due date pushes the primary button under the fold on a 4.7" screen.
        _ = tapWhenOnScreen("Get started", "Get started")
        // Onboarding is done when the sheet is gone and Home names the baby.
        let onHome = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] 'Edit profile'")).firstMatch
        let named = first(app.staticTexts, startingWith: "Rowoon")
        if !onHome.waitForExistence(timeout: 15), !named.exists { note("MISSING the profile on Home after Get started") }
        beat(2.0)
    }

    /// The date field opens a calendar popover (no wheels, and typing does nothing). Walk back to the
    /// birth month and pick the day; fall back to today so the run never stalls on a picker.
    private func birthday() {
        guard let box = inputBox("Birthday") else { note("MISSING the birthday field"); return }
        hit(box)
        let header = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] '2026' OR label CONTAINS[c] '2025'")).firstMatch
        guard header.waitForExistence(timeout: 10) else { note("no calendar popover"); return }
        beat(0.8)
        let back = app.buttons["Previous Month"]
        var guardRail = 0
        while !app.staticTexts["April 2025"].exists, back.exists, guardRail < 30 {
            hit(back); guardRail += 1
            Thread.sleep(forTimeInterval: 0.25)
        }
        beat(0.6)
        let day = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'April 17'")).firstMatch
        if day.exists { hit(day) } else {
            note("April 17 not on the calendar; taking today")
            let today = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] 'Today'")).firstMatch
            if today.exists { hit(today) }
        }
        beat(0.8)
        if app.buttons["Done"].exists { app.buttons["Done"].tap(); beat(0.8) }
    }

    private func home() {
        note("home")
        beat(1.5)
        app.swipeUp(); beat(1.2)
        app.swipeUp(); beat(1.2)
        app.swipeDown(); beat(0.8)
        app.swipeDown(); beat(1.0)
    }

    private func milestonesAndSource() {
        note("milestones and a source citation")
        _ = tap("Milestones", "the Milestones tab")
        beat(1.6)
        // A milestone row is a button that is not chrome, not a month chip, not the parent-note
        // accordion and not a source badge.
        let isRow = NSPredicate(format: """
            NOT (label BEGINSWITH[c] 'Source:') AND NOT (label BEGINSWITH[c] 'Note for parents') \
            AND NOT (label BEGINSWITH[c] 'See all') AND NOT (label BEGINSWITH[c] 'Edit profile') \
            AND NOT (label MATCHES '^[0-9]+$') \
            AND NOT (label IN {'Settings','Home','Milestones','Play','Safety','Journal','Close','Back','Done','Reset'})
            """)
        let row = app.buttons.matching(isRow).firstMatch
        if row.waitForExistence(timeout: 10) { hit(row); beat(2.4) } else { note("no milestone row to confirm") }
        // the citation: organisation, a summary of the page, a link and the date last checked
        if !tapFirst(app.buttons, startingWith: "Source:", "a source badge", timeout: 6) {
            _ = tapFirst(app.staticTexts, startingWith: "Source:", "a source badge", timeout: 6)
        }
        beat(2.8)
        _ = tap("Close", "the source card close button", timeout: 6)
        beat(1.0)
    }

    private func playAndSafety() {
        note("play and safety")
        _ = tap("Play", "the Play tab")
        beat(2.2)
        app.swipeUp(); beat(1.4)
        _ = tap("Safety", "the Safety tab")
        beat(2.2)
        app.swipeUp(); beat(1.4)
    }

    private func journal() {
        note("journal: user-generated content, private to this account")
        _ = tap("Journal", "the Journal tab")
        beat(1.6)
        guard tap("New entry", "New entry", timeout: 8) || tap("Write the first entry", "the empty-state button", timeout: 4) else { return }
        beat(1.2)
        _ = fill(app.textFields.firstMatch, "First steps", "the entry title")
        _ = fill(app.textViews.firstMatch, "She walked across the room today, all on her own.", "the entry body")
        if app.keyboards.buttons["Done"].exists { app.keyboards.buttons["Done"].tap(); beat(0.6) }
        _ = tap("Preview", "Preview", timeout: 5)
        beat(1.6)
        _ = tap("Save", "Save")
        beat(2.0)
    }

    private func settingsAndLanguage() {
        note("settings and the English/Korean switch")
        _ = tap("Home", "the Home tab")
        beat(1.0)
        _ = tap("Settings", "the settings gear", timeout: 10)
        beat(1.8)
        _ = tap("한국어", "the Korean option", timeout: 6)
        beat(2.4)                                   // the whole app reflows into Korean
        _ = tap("English", "the English option", timeout: 6)
        beat(1.8)
    }

    private func reminders() {
        note("optional local reminders")
        let toggle = app.switches.firstMatch
        if toggle.waitForExistence(timeout: 6) {
            hit(toggle)
            _ = tapSystemAlert(["Allow", "Allow While Using App", "OK"])
            beat(1.6)
        } else if tap("Reminders", "the reminders toggle", timeout: 5) {
            _ = tapSystemAlert(["Allow", "Allow While Using App", "OK"])
            beat(1.6)
        } else {
            note("no reminders toggle in view")
        }
    }


    // MARK: - account: registration, login, deletion

    private var demoEmail: String { env("DEMO_EMAIL") }
    private var demoPassword: String { env("DEMO_PASSWORD") }

    /// Apple asks to see registration, login and deletion. All three run on a throwaway account so the
    /// credentials handed to App Review are never the ones destroyed on camera. GoTrue keeps email
    /// confirmation on, so the harness confirms this one address while the take is paused between the
    /// registration and login beats.
    private func accountBeats() {
        note("account: registration, login, deletion")
        guard !demoEmail.isEmpty, !demoPassword.isEmpty else { note("no demo credentials supplied"); return }

        openSignInSheet()
        guard !rehearsal else { note("rehearsal: showing the sheet only"); _ = tap("Close", "close the sheet"); return }

        register()
        signInWithPassword(what: "login straight after registering")
        signOutBeat()
        openSignInSheet()
        revealPasswordForm()
        fillCredentials()
        signInWithPassword(what: "login")
        deleteBeat()
    }

    private func openSignInSheet() {
        _ = tapWhenOnScreen("Sign in", "the Sign in row")
        beat(2.2)                                   // the sheet: Apple, Google, an email link, a password
    }

    private func revealPasswordForm() {
        _ = tap("Use a password instead", "the password disclosure", timeout: 10)
        beat(1.2)
    }

    /// Tapping the next field is what moves focus; Return is never pressed between fields because it
    /// submits the web form, which would send an empty password.
    private func fillCredentials() {
        _ = fill(app.textFields.firstMatch, demoEmail, "the demo email")
        _ = fill(app.secureTextFields.firstMatch, demoPassword, "the demo password")
        dismissKeyboard()
    }

    private func register() {
        note("registration")
        revealPasswordForm()
        _ = tap("New here? Create an account", "the create-account switch", timeout: 8)
        beat(1.0)
        fillCredentials()
        _ = tapWhenOnScreen("Create an account", "the Create account button")
        if !app.staticTexts["Check your inbox to confirm your address."].waitForExistence(timeout: 30) {
            note("MISSING the registration confirmation message")
        }
        beat(4.0)                                   // the harness confirms the address in this window
        _ = tap("Already have a password? Sign in", "the sign-in switch", timeout: 8)
        beat(1.0)
    }

    private func signInWithPassword(what: String) {
        note(what)
        _ = tapWhenOnScreen("Sign in with password", "the password sign-in button")
        let signedIn = first(app.staticTexts, startingWith: "Signed in as")
        if signedIn.waitForExistence(timeout: 45) { beat(2.6) } else { note("MISSING the signed-in row after \(what)") }
    }

    private func signOutBeat() {
        note("sign out: the records stay on the phone")
        _ = tapWhenOnScreen("Sign out", "the Sign out row")
        beat(2.4)
    }

    private func deleteBeat() {
        note("account deletion")
        _ = tapWhenOnScreen("Delete account", "the Delete account row")
        beat(1.8)                                   // the confirmation dialog
        _ = tap("Delete", "the destructive confirm")
        if !app.staticTexts["Account deleted."].waitForExistence(timeout: 40) { note("MISSING the deletion toast") }
        beat(3.0)
    }

    private func finish() {
        note("done")
        beat(1.5)
        app.swipeDown()
        beat(1.2)
        XCUIDevice.shared.press(.home)
        beat(2.5)
    }
}
