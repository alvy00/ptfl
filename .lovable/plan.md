# Overview tab rebuild — editorial case-study wall

Rebuild the Overview tab (`src/components/portfolio/graph/GitGraphOverview.tsx`) from a uniform dark card grid into a calm, editorial case-study wall aimed at recruiters and non-technical readers. The Graph/Timeline tab is untouched, and no data files change.

## What the new tab looks like

**Header**
- Status pill kept ("Open for Opportunities • RUET Chemical Engineering") but calmed: solid dot, no ping ring, no blinking cursor.
- Headline in large display type (48–64px, heavy weight, tight tracking): "Self-taught engineer shipping real, production software."
- One supporting sentence in muted body type, capped at ~60ch.
- The three stats (projects shipped / features logged / technologies used) become quiet inline footnote text — no chips or borders.
- "Get in touch" CTA restyled as a solid coral `#FF6B4A` rounded-full button with dark text and a subtle hover scale/shadow. Mailto string and CRLF body logic stay byte-identical.

**Filter bar**
- Same tablist logic (roving tabindex, Arrow/Home/End, `aria-selected`, sliding `layoutId` pill) — only the styling changes: plain-language pills, active = solid coral, inactive = muted text with no border.

**Case-study panels** (replaces the card grid)
- Vertically stacked large panels, `rounded-3xl`, `max-w-6xl` container, generous vertical rhythm.
- Desktop: two columns, alternating — even index puts the color-wash hero left, odd index right. Tablet and mobile stack hero-on-top.
- Hero (~40% width desktop; ~140px tall on mobile): soft gradient built from that project's own `accent` at low opacity fading into the surface color, with the project's short name in oversized display type set directly on the wash. Accent is muted at rest and intensifies on hover/in-view.
- Content side, in order: mono eyebrow with `timeframe.label`; one plain-language outcome sentence; action row with a solid "View live demo →" button plus code links as quiet text links (keeping the existing chevron translate-on-hover detail).
- One collapsed-by-default accordion, "See what's inside". Expanded, it shows the stack tags as quiet pills and the features as a plain two-column title + detail list. No "+" diff marks, no line numbers, no changelog framing.

**Signature interaction**
- Desktop pointer devices only: hovering a project's hero shows a ~140×90px accent-colored preview chip that trails the cursor with spring-damped lag (`useMotionValue` + `useSpring`), fading in/out over ~150–200ms. Gated on `window.matchMedia('(pointer: fine)')` so the mousemove listener never mounts on touch; the listener is scoped to the panel, not `window`.

**Motion**
- Each panel's hero breathes in once on scroll (`opacity 0→1`, `scale 0.97→1`, ~0.6s easeOut, `viewport={{ once: true, margin: "-10%" }}`). No word-by-word staggering.
- Filter switching keeps the existing `AnimatePresence` crossfade, so the list updates calmly rather than remounting.
- Every animation is gated on `useReducedMotion`: reduced motion means fade-only reveals and a snapped (non-lagging) cursor chip, not dead elements.

## Copy

Headline is confirmed. I will draft new one-sentence, outcome-first blurbs for each of the four projects (AuctaSync, AssetVerse, AsyncLangAI, CareerPilot) — plain language, no jargon, no buzzwords. These live in the Overview component as an override map keyed by project id, so `projects.ts` stays untouched and the Graph tab keeps its original technical descriptions. I will list each drafted sentence at the end so you can edit them.

## Technical notes

- Only `GitGraphOverview.tsx` changes; the export name stays `GitGraphOverview` (legacy name, no import updates needed). Internal `FeatureLog` becomes `CaseStudyAccordion`, `ProjectCard` becomes `CaseStudyPanel`.
- Data import, `PROJECT_ORDER` sort-by-start-date, `MAILTO`, and the tablist keyboard handler are preserved as-is.
- Design tokens (`#0B0C10`, `#15171C`, `#F5F5F3`, `#8A8D94`, `#FF6B4A`) are added to `src/styles.css` as CSS variables mapped through `@theme inline` so they are used as Tailwind classes rather than hardcoded hex in JSX. Per-project accents stay inline styles since they come from data.
- No new display font is loaded — headlines use the existing sans stack at weight 700 with tight tracking. Mono is demoted to eyebrows, dates, and tags only.
- Accordion height animates via an `AnimatePresence` height/opacity wrapper; `aria-expanded` / `aria-controls` wiring is carried over.
- Accessibility preserved throughout: visible focus rings on every interactive element, `rel="noopener noreferrer"` on external links, 44px minimum touch target on the mobile accordion toggle.
