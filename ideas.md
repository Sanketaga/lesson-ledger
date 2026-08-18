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
