# MathZine NOWNESS-Inspired Design

## Source Reference

- Source URL: https://www.nowness.com/
- Reference screenshots:
  - `.omx/artifacts/visual-ralph/nowness/source-nowness-top-desktop-1440x900.png`
  - `.omx/artifacts/visual-ralph/nowness/source-nowness-top-mobile-390x844.png`
- Font audit:
  - `.omx/artifacts/visual-ralph/nowness/nowness-font-audit.json`
  - `.omx/artifacts/visual-ralph/nowness/nowness-visible-font-samples.json`
- Scope note: use NOWNESS as a visual and interaction reference only. Do not copy its brand, article copy, media, logo, or proprietary content. MathZine keeps its own content, routes, permissions, and generated/local assets.

## Design Intent

MathZine should feel less like a dashboard and more like a moving-image editorial magazine for mathematics. The homepage should open with one dominant media moment, a restrained masthead, minimal uppercase navigation, and a horizontal issue/article rail. Functional areas such as latest issue, article reading, problem solving, ranking, board posts, and writing tools should remain visible, but they should appear as editorial modules instead of generic feature cards.

## Borrowed From NOWNESS

- Centered large wordmark with quiet left/right utility icons.
- Thin top navigation and ample white space.
- One cinematic hero media frame occupying most of the first viewport.
- Centered overlay title/deck on top of the hero photo across desktop and mobile.
- Horizontal rail of recent items below the hero.
- Editorial section headings in small uppercase tracking.
- Minimal controls: icon-like buttons, simple outlined/filled rectangles, and arrow controls.

## MathZine Adaptation

- Hero content maps to the latest/lead article as a static photographic story frame, not a video story.
- The whole hero photo links to the lead article; do not place a play button over the image.
- Queue/member controls become Search, Studio, Login/Profile, and role-aware Admin links.
- NOWNESS category labels become MathZine routes: Issues, Articles, Hall, Board, Studio.
- Article rail uses MathZine articles and local generated math imagery.
- Ranking and board modules use compact editorial rows, not dashboard cards.
- Issue archive remains a core magazine function and should be visually prominent.

## Layout System

### Header

- Desktop:
  - 80px masthead band with hamburger-like menu mark at left, centered `MathZine`, utility icons at right.
  - Second nav row with uppercase links centered.
  - Search is an icon-first form, visually quiet until focused.
- Mobile:
  - Brand moves left, utilities stay right, nav scrolls horizontally.
  - Search expands to full width when space requires.

### Homepage

1. Hero media story
   - Full-width media frame with local abstract math image.
   - Static photo treatment without video or player controls.
   - Lead title and deck overlay on the image at all breakpoints.
   - Primary actions: read lead article, solve linked problem.

2. Latest rail
   - Horizontal scroll list with date/issue labels, thumbnail, title, metric badge, and arrow button.
   - Works even with empty data by showing a simple status note.

3. Editorial modules
   - Latest issue: large issue object and issue archive action.
   - Hall of fame: ranking rows with score and compact profile rhythm.
   - Popular articles: stacked text rows with article metadata.
   - Board/notices: minimal text list with board action.

4. Archive
   - Dense but elegant article archive grouped by issue.
   - Each issue group has a visible heading/count divider.
   - Article cards use section, title, excerpt, and metadata with clear borders so entries do not read as one continuous text block.

## Visual Tokens

- Background: true white for NOWNESS-like clarity, not parchment.
- Text: near-black `#111111`.
- Muted text: cool gray `#6f6f6f`.
- Rule: light gray `#dedede`; strong rule `#b98b45` for MathZine editorial gold accents.
- Accent: warm gold `#b98b45`, used sparingly for rules, scores, and active states.
- Dark surface: `#151719` for image captions and overlays.
- Radius: mostly `0`; media and buttons stay squared or subtly 2px.
- Shadow: avoid decorative elevation; rely on image contrast and rules.

## Typography

- Masthead: `Old English Text MT` fallback stack remains for MathZine identity, but size/placement follows NOWNESS.
- Source audit: NOWNESS visible text renders primarily as `futura-pt, Helvetica, Arial, sans-serif`; loaded family names also include `FuturaPTBook`, `Brandon Text`, `NownessPicksSmallUseLockup`, and `Gota Light`.
- Implementation stack: use `futura-pt`, `"Futura PT"`, Helvetica, Arial, then Korean system fallbacks for homepage/header UI. Do not copy proprietary font files from NOWNESS; if a licensed Futura PT/Typekit kit is later configured, the existing variables should pick it up.
- Headlines: NOWNESS-like sans for the homepage hero and controls, with 700 weight for hero titles, 500 for card titles, and 200 for decks/meta.
- Article/detail pages may keep serif body typography.
- UI labels: uppercase, small, high tracking, system sans.
- Do not use visible instructional copy to explain features.

## Buttons And Controls

- Primary button: black fill, white text, rectangular.
- Secondary button: white/transparent fill, black border.
- Icon buttons: search, studio, profile, menu, arrows.
- Each control must link to an existing route or submit an existing form.
- Hover states are quiet: black-to-gold or underline, no heavy gradients.

## Media Assets

Use project-local generated bitmap assets under `public/mathzine-media/`:

- `hero-fractal-symbols.png` - current homepage hero, mathematical fractal/symbol artwork with dark lower text-safe area.
- `hero-sine-observatory.png`

The homepage rail and latest-issue module must use each issue's uploaded `coverImageSrc` when available. If a cover is missing, render the code-native MathZine cover placeholder; do not fall back to sample thumbnail images.

Fallback issue covers should read as real mathematical magazine covers, not plain placeholders:

- Use layered equation curves, orbit lines, fractal/tree geometry, grid structure, and subtle math glyphs.
- Keep issue number, brand, and article count inside the cover art.
- Vary color tone by issue number while staying in the MathZine dark editorial palette.
- All rail and latest-issue covers use the actual magazine-cover ratio `210 / 297`; do not crop or stretch cover artwork.
- Uploaded `coverImageSrc` assets must be scaled inside the cover frame with preserved aspect ratio.

## Responsive Rules

- At widths below 860px, the hero remains a static image frame with title/deck overlaid on the photo.
- Horizontal rails stay scrollable with stable thumbnail dimensions.
- Four-column grids collapse to two columns, then one column.
- Buttons become full-width only in narrow stacked action rows.
- Text must not overlap imagery or controls.

## Acceptance Criteria

- Homepage visually reads as a high-taste editorial magazine, not a portal dashboard.
- Existing routes remain reachable: `/issues`, `/hall-of-fame`, `/board`, `/studio`, `/search`, login/account/admin routes.
- Lead article, issue archive, ranking, popular articles, notices, and archive still use live `getHomepageData` data.
- Desktop and mobile screenshots are free of obvious overlap, clipping, placeholder boxes, and browser-default controls.
- Final QA compares local implementation screenshots against the saved NOWNESS reference screenshots and records the verdict in `design-qa.md`.
