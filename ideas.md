# Educational Video Catalog — Design Directions

## Three stylistic approaches

| Theme Name | Very Brief Intro | Probability |
| --- | --- | --- |
| **Field Notes Library** | A warm, editorial learning archive inspired by annotated notebooks, catalog cards, and an active study desk. It makes discovery feel focused, personal, and quietly optimistic. | 0.07 |
| **Signal Classroom** | A precise Swiss-modern interface with rigorous spacing, bold typographic hierarchy, and one electric accent. It treats learning as a clear signal amid a noisy web. | 0.03 |
| **Archive After Dark** | A cinematic media library in deep ink with restrained spectrum color and documentary texture. It turns educational videos into a curated late-night viewing room. | 0.09 |

## Chosen approach: Field Notes Library

### Design Movement

**Contemporary editorial design with library-card and field-notebook influences.** The interface should feel like a reliable research shelf made tactile for the web—not a generic streaming service.

### Core Principles

1. **Curated clarity:** Information is treated as a collection of useful references, with topic, level, duration, and source always easy to scan.
2. **Tactile restraint:** Paper warmth, soft rules, annotation marks, and lightly imperfect geometry add character without impeding reading.
3. **Asymmetric discovery:** A persistent filter rail and a wider, responsive content field create the sense of navigating a collection rather than a landing page.
4. **Trust made visible:** The source, learning level, duration, and direct-link behavior are explicit, while optional integrations remain clearly labeled.

### Color Philosophy

The base is **paper ivory** and warm graphite to create a calm study environment rather than a clinical dashboard. **Verdigris** is the ownable signal color, used for active states and actionable paths, because it evokes found objects, library stamps, and enduring tools. A restrained rust-orange appears only as a human editorial counterpoint for featured material and subject badges.

### Layout Paradigm

The experience follows a **catalog drawer layout**. A slim left rail holds the collection identity, topic filters, and the live/optional provider status. The right field begins with an angled editorial lead, then continues into a loose card index that reflows from one column to varied card spans—not a rigid centered grid. On small screens, the rail becomes a horizontal strip and the index becomes a single reading column.

### Signature Elements

1. **Catalog tabs:** tiny colored index tabs and ruled metadata strips used on cards, buttons, and sections.
2. **Annotation marks:** small handwritten-style arrows, underlines, or badges that call attention to useful system states without becoming decoration for its own sake.
3. **Corner cut cards:** lightly clipped or ticket-like corners used sparingly on featured content and the URL import panel.

### Interaction Philosophy

Interactions should feel like pulling a card from a drawer: deliberate, quiet, and direct. Filtering is immediate, selected controls receive a strong verdigris fill, and URL import offers clear validation language. The catalog never pretends that the optional live provider is enabled.

### Animation

Cards enter with a 160–220ms opacity-and-translate transition, staggered by 45ms. Filter changes use a short opacity transition rather than disruptive rearrangement animation. Buttons depress to 0.97 scale on activation. Hovering a card raises its paper edge by 2px and deepens its shadow; `prefers-reduced-motion` removes all nonessential transitions.

### Typography System

**Fraunces** is used for editorial headings and numerals that need character; **DM Sans** carries navigation, metadata, and interface copy for clean legibility. Headings use compact, high-contrast scales with occasional italic emphasis. Metadata is compact, tracked slightly, and uses uppercase only for short labels.

### Brand Essence

**Lesson Ledger is a dependable, curated video shelf for learners who want to spend their attention on understanding—not searching.**

Personality: **considered, candid, resourceful**.

### Brand Voice

Headlines are active and grounded, while microcopy explains what will happen without marketing hype. CTAs are short, specific verbs.

> “Find the next useful explanation.”

> “Paste a video link—we’ll set the context.”

### Wordmark & Logo

The mark is a simple **ledger tab with a play-cutout**: an offset, rounded vertical tab with a triangular notch, rendered in verdigris and rust. It works as a favicon and as a small, recognizable artifact next to the custom Fraunces wordmark.

### Signature Brand Color

**Ledger Verdigris — `#08756A`**

## Style Decisions

- Main catalog shelves use an **editorial index rhythm**: a larger featured drawer moment, catalog rules, and varied card emphasis instead of a uniform streaming grid.
- Every platform thumbnail is visually **filed into Lesson Ledger** through an ivory paper mount, record mark, and metadata strip.
- **Rust-orange is editorial-only**: it marks featured records, annotation stamps, and human subject cues. Ledger Verdigris remains the sole primary action and active-state color.
