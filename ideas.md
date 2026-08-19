# Educational Video Catalog — Reference Ground Truth

## Supplied Reference

The supplied reference is **https://focusroom.club/**. Its visual and interaction language is the ground-truth specification for this redesign. The work must retain the catalog’s core behavior but move decisively away from the previous Field Notes Library concept.

## Reference-derived visual system

### Design Movement

**Airy editorial learning workspace.** The interface combines a high-key near-white canvas, large literary serif headlines, compact modern sans-serif utility text, and very restrained geometric decoration. It feels focused and deliberate rather than content-dense or app-like.

### Composition

Use a slim transparent top navigation and a large centered hero. The main title should receive expansive breathing room and the primary input/action should sit immediately below it as the focal interaction. Subsequent sections alternate between oversized serif statements and lean explanatory columns. Large empty regions are intentional and must remain.

### Color and Material

The dominant surface is a cool warm-white (`#FBFBFA` / `#F7F7F5`) with deeply inked charcoal text. The primary action is a dark charcoal block; accent geometry uses whisper-soft ice blue, pale lavender, and low-opacity graphite rules. Color should never compete with content. The existing verdigris, rust, paper texture, card clipping, catalog tabs, and warm-beige drawer rail are intentionally retired.

### Typography

Use a high-contrast editorial serif for the hero and major section statements, supported by a clean neutral sans for utility controls and metadata. Headline scale is generous, line-height is tight, and supporting copy is light, open, and narrow. Avoid all-caps metadata systems except where essential.

### Signature Motifs

1. **Soft geometry:** thin circular outlines, translucent rounded squares, dotted matrices, and pill shadows around the hero—subtle enough to almost disappear.
2. **Quiet input command:** one large bordered request field with a concise, dark rectangular action button.
3. **Focused learning workspace:** catalog results should be organized as calm course-like rows or lesson cards with visible progress and muted source treatment, not a dense streaming grid.

### Interaction and Motion

Hero decorations drift or fade only slightly; controls use crisp 160–200ms transitions. Search and catalog filters are immediate. Card hover should be a tiny lift and border-darkening, not a dramatic animation. Respect reduced motion.

### Content Translation

The hero asks what the learner wants to study. The existing local catalog becomes the “structured learning shelf” below it. Direct URL import remains a first-class path through the same central command input. Invidious remains clearly optional and unavailable by default.

### Restrictions

Do not copy the reference’s logo, copywriting, routes, or trademarked brand name. Build an original **Lesson Ledger** experience that adopts only the reference’s broad composition, restrained visual language, and focus-first learning behavior.

## Focused Course Workspace

Search is a commitment, not a filter. A submitted learning request now opens a dedicated course workspace without topic controls. The workspace places one embedded lesson beside a numbered outline, keeps progress visible, and does not offer an exit to an external video page. The learner can change subject deliberately through a single course-building input rather than returning to a distracting catalog grid.

## Student Learning Loop

The first learning loop is intentionally lightweight and browser-persisted so a student can begin without an account. Each course keeps a learner-defined outcome, an active lesson for resuming, completed lessons, timestamped notes, and one short recall response per lesson. Auto-advance is on by default; once a lesson is marked complete, the next lesson begins after a short, visible transition. Students can turn it off when they prefer a deliberate pause.

The focused course now renders the learning goal, auto-advance control, notes composer, completion action, and progress count alongside the ordered lesson outline. The next validation step exercises persistence and the auto-advance learning loop in the interactive workspace.

Interactive validation confirms that a student goal can be entered and a note saved against a manual timestamp. The saved note is immediately shown under the active lesson as `02:15 · Variables store values I can reuse.`

Completion updates course progress from `0/8` to `1/8`, reveals the recall prompt, and auto-advances to Lesson 02 on its three-second countdown. The final design must preserve an opportunity to save the recall response rather than letting the automatic transition hide it.

After reload, the course resumed at Lesson 02 with the first lesson still marked complete, the `1/8` progress count preserved, and the student goal retained. The revised interface clearly communicates an eight-second reflection window and its pause-on-writing behavior.

The completion-control interaction needs a fresh, deterministic browser validation after the hot-reloaded course state settled; the persisted progress and resumed position remain intact.

The owned completion action was exercised deterministically. Without any student input during the reflection window, the course advanced automatically from Lesson 02 to Lesson 03, started the next lesson state, and persisted progress at `2/8`.

On Lesson 03, completion displayed the recall prompt, the explanatory pause-on-writing message, and an eight-second next-lesson countdown while updating persisted progress to `3/8`. The interactive test needs to place focus in that prompt before the countdown elapses.

Entering a reflection immediately after completion cancelled the countdown. More than eight seconds later, the course remained on Lesson 03 with the written response still present, confirming that a student can think and write without being pushed ahead.

The saved reflection action closed the recall prompt while keeping the learner on the same course route. The final validation confirms that this response is retained with the rest of the student learning record.

## Student Media Controls

The embedded lesson is cross-origin, so a browser page cannot read its pixels directly into a canvas. The screenshot action therefore uses the browser’s explicit tab-capture permission: the student chooses the current tab in the share picker, Lesson Ledger crops the captured tab image to the visible player surface, and downloads a PNG. The action is transparent about the permission step and never sends the capture elsewhere.

The player keeps course-owned Play/Pause and Screenshot buttons visible at the surface. A single **Ctrl** press (outside text fields) toggles the same course-owned playback state. The playback command is sent through the embedded player API while the provider frame remains outside normal pointer and keyboard interaction.

Interactive inspection confirms that **Play · Ctrl** and **Screenshot** are visible at the upper-right of the focused player while the lesson remains inside Lesson Ledger. The next checks exercise their owned state changes and capture-feedback path.

The visible **Play** control successfully changes to **Pause** while preserving the course route. The interactive browser maps a standalone Control press to its platform Meta key, so the Ctrl handler is verified directly with a matching keyboard event rather than treating that browser translation as a student-facing failure.

The Ctrl handler is assigned as the page’s single window keyboard owner. This avoids duplicate toggles during development reloads while preserving the visible Play/Pause button as an always-available alternative.

After the single-owner update, a Ctrl keyboard event changed the owned player control from **Play** to **Pause** while the course route stayed unchanged. Both the on-screen control and the documented shortcut therefore use the same media state.

The public live-search providers were transiently unavailable during the final capture check. The media controls are therefore validated against a bundled catalog lesson, which is the reliable fallback path and uses the same focused player.

With the bundled neural-network lesson open, the real Screenshot action reached the browser permission step and displayed its in-page guidance to choose the current tab. The capture cannot continue until the native browser picker receives that tab selection.

The first live capture attempt was cancelled before a tab was selected. The screenshot action has been started again and is waiting at the same current-tab permission step; the cancellation feedback is clear and keeps the student in the course.

The user-selected current tab completed the live capture successfully. Lesson Ledger displayed “Screenshot downloaded. It stays on your device.” while the student remained in the bundled neural-network course, confirming the end-to-end local download path.

The revised focused player now displays course-owned **5s back**, **Play/Pause**, **5s forward**, and **Screenshot** actions together. After playback began, the forward control returned the in-page status “Moved forward 5 seconds,” without leaving the course.

The repaired Screenshot action now enters a clear pending state labelled “Capturing” and explains that the current Lesson Ledger tab must be selected. The native browser picker is awaiting that final tab selection to create the preview and downloadable image.

## Reliable Course Snapshot

The screen-sharing requirement is intentionally removed. The new Snapshot action creates a one-click, local SVG study card containing the course title, active lesson, source, lesson position, and Lesson Ledger course timer. It is not presented as a pixel-perfect copy of a third-party video frame; instead, it is a dependable course-owned reference image that works even when embedded media is cross-origin or the provider blocks playback.

## Actual Video-Frame Snapshot

The student now requires the actual video image currently visible in the player rather than a generated study card. Because the provider media is cross-origin, Lesson Ledger cannot read its pixels directly. The actual-frame Snapshot therefore asks the browser to share only the current Lesson Ledger tab, briefly hides its own player chrome, crops the shared-tab feed to the exact embedded video rectangle, and saves that PNG locally. This is the only truthful route to a live provider-frame capture; if a student declines permission, no substitute image is created.

The native share request is made immediately in the Snapshot button’s click gesture. Waiting for a render or animation frame before asking for the browser picker causes some browsers to cancel the request. Once the student selects the **Lesson Ledger** tab and presses **Share**, the player’s own course chrome is hidden only long enough for the frame crop. Tab audio is unnecessary for an image capture.

## External Vercel Release

The Vercel release structure separates static browser assets from dynamic API routes. The Vite build writes the course application to `dist/public`, while a catch-all `/api/*` Vercel Node Function imports the same Express app used in local development. This retains same-origin tRPC and OAuth paths without exposing a fixed listening port. Platform-managed OAuth, database, and Forge credentials still require externally valid replacements before a Vercel release can authenticate users or access platform-specific storage services.

## Natural-Language Learning Requests

Students should be able to type the way they speak. The course command normalizes common instructional framing—such as “I want to learn Python” or “teach me intro to Python for beginners”—to the concise search topic `python`. The same normalized topic drives the local catalog, live-provider request, course title, and browser-stored learning record. A vetted Python course now guarantees a useful local starting point even when third-party live-search providers are unavailable.

## Universal Live Course Discovery

An arbitrary learner request is a live discovery request, not a catalog-only lookup. Lesson Ledger sends each normalized topic to several public YouTube-compatible Piped and Invidious relays at once and returns as soon as the first healthy source supplies usable videos. This prevents a blocked public relay from delaying or emptying a course even when another provider has results. The focused course shows a direct retry action only when every live provider is temporarily unavailable.

Implementation research sources: [Piped API documentation](https://docs.piped.video/docs/api-documentation/) documents unauthenticated instance APIs and recommends dynamic instance awareness; its [public-instance list](https://raw.githubusercontent.com/TeamPiped/documentation/refs/heads/main/content/docs/public-instances/index.md) identified the tested Piped relays. The [Invidious API documentation](https://docs.invidious.io/api/) confirms the compatible `/api/v1/search` format used as a parallel fallback.

Browser validation confirms that clicking **Snapshot** immediately generated a local preview, downloaded the image, and displayed the success message without opening any tab-sharing permission picker. The preview and repeat-download action remain inside the focused course.

The repaired capture completed successfully: the player reported “Screenshot ready and downloaded,” displayed an in-page preview, and exposed a **Download again** action. The visible rewind control also returned “Moved back 5 seconds,” confirming both five-second directions now respond within the focused course.

### Validation Observation

The dedicated `/learn/<query>` route resolves an ordinary request into an eight-lesson in-site course workspace. The route shows a single embedded lesson, a numbered outline with a visible current lesson, and no topic section. Application navigation returns only to the library; Lesson Ledger itself provides no external-source action in the focused workspace.

Provider-owned embeds may render their own channel and source controls. The focus player therefore blocks pointer access to the provider frame, starts video through a Lesson Ledger action, strips provider controls and fullscreen from the embed configuration, and keeps the course outline as the sole lesson-navigation mechanism.

Browser verification confirms the provider frame is covered by a Lesson Ledger-owned “Play lesson here” control before playback begins. The visible focus surface provides only Lesson Ledger course navigation and reports that external navigation is disabled.

Selecting the second item in the course outline updates the active lesson to “Lesson 02 of 08” within the same `/learn/python%20programming` route and restores the owned playback guard. This maintains one active lesson at a time without navigating away from the course.

The provider iframe is removed from the app’s tab order and accessibility tree, while its full surface remains pointer-blocked beneath the Lesson Ledger overlay. Keyboard navigation should therefore move only through the site header, course builder, owned play action, and outline buttons.

Initial keyboard navigation in the focused course highlights Lesson Ledger-owned header controls. Direct focus inspection is required to confirm that the provider iframe is skipped throughout the course-control sequence.

Focus inspection confirms the media frame has `tabIndex=-1`, `aria-hidden=true`, and `pointer-events:none`; the positive tab-order list contains only Lesson Ledger header, course-builder, owned playback, and outline controls. Provider links do not enter the app’s keyboard focus sequence.

The focused player visibly places a Lesson Ledger-owned full-surface play action and a bottom navigation guard above the provider frame. Final validation targets that guarded bottom region with a pointer click rather than using provider-internal accessibility elements.

A physical click in the guarded player area remained on the same Lesson Ledger course route. The provider may show an in-frame anonymous-playback confirmation, but no external page opened and the only learner navigation remains the course outline and library controls.

The visible provider confirmation-link region was also targeted by a physical pointer click while the full Lesson Ledger overlay was active. The route remained `/learn/python%20programming`, confirming that the overlay intercepted the click rather than allowing external navigation.

The rendered “Learn more” confirmation-link area inside the provider frame was subsequently targeted directly. The application stayed on the same focused-course route, with the Lesson Ledger overlay still active and no external navigation initiated.

After native inertness was added to the provider frame, the focused course continued to load its owned play action and ordered outline successfully. The provider frame remains visually present for media rendering but is intentionally excluded from the learner’s interaction model.

Browser inspection confirmed `inert=true`, `tabIndex=-1`, `aria-hidden=true`, and `pointer-events:none` on the provider frame. An attempted activation of the visible provider-owned “Watch on YouTube” control did not leave the `/learn/python%20programming` route.
