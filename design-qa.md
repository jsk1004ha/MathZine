source visual truth path: `.omx/artifacts/visual-ralph/nowness/source-nowness-top-desktop-1440x900.png`
implementation screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-prod-desktop-1440x900.png`
mobile implementation screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-prod-mobile-390x844.png`
comment viewport screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-prod-comment-795x844.png`
fractal hero screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-fractal-hero-835x898.png`
fractal hero desktop screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-fractal-hero-desktop-1440x900.png`
fractal hero mobile screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-fractal-hero-mobile-390x844.png`
issue cover placeholder screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-issue-cover-placeholder-835x898.png`
issue rail cover ratio screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-issue-rail-cover-ratio-835x898.png`
archive separated screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-archive-separated-795x844.png`
desktop mid-section screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-prod-desktop-mid-1440x900.png`
mobile mid-section screenshot path: `.omx/artifacts/visual-ralph/nowness/implementation-prod-mobile-mid-390x844.png`
font audit path: `.omx/artifacts/visual-ralph/nowness/nowness-font-audit.json`
font metrics path: `.omx/artifacts/visual-ralph/nowness/implementation-font-metrics.json`
issue rail metrics path: `.omx/artifacts/visual-ralph/nowness/implementation-issue-rail-metrics.json`
hero overlay metrics path: `.omx/artifacts/visual-ralph/nowness/implementation-hero-overlay-metrics.json`
archive separation metrics path: `.omx/artifacts/visual-ralph/nowness/implementation-archive-separated-metrics.json`
fractal hero metrics path: `.omx/artifacts/visual-ralph/nowness/implementation-fractal-hero-metrics.json`
issue cover placeholder metrics path: `.omx/artifacts/visual-ralph/nowness/implementation-issue-cover-placeholder-metrics.json`
issue rail cover ratio metrics path: `.omx/artifacts/visual-ralph/nowness/implementation-issue-rail-cover-ratio-metrics.json`
viewport: desktop 1440x900, browser-comment 795x844, mobile 390x844
state: logged-out public homepage, production server at `http://localhost:3000/`
full-view comparison evidence: NOWNESS reference and MathZine production screenshot were opened with `view_image` in the same QA pass.
focused region comparison evidence: mid-section desktop/mobile screenshots were opened with `view_image` after typography changes to verify rail/module labels and card text.
patches made since previous QA pass: replaced the hero asset with `hero-fractal-symbols.png`, a generated mathematical artwork using fractal silhouettes, golden-ratio spirals, sine ribbons, coordinate grids, and subtle math symbols; changed the below-hero rail from article/sample thumbnails to issue covers; removed sample image usage; upgraded code-native cover placeholders for issues without uploaded covers with SVG equation curves, orbit lines, fractal geometry, math glyphs, issue-tone variations, and true `210 / 297` cover ratio in the rail and latest-issue module; uploaded cover images are framed and scaled with `object-fit: contain`; removed the hero play button and mobile-only text block; made the lead title/deck overlay the static photo at desktop, browser-comment, and mobile widths; grouped the archive by issue with visible headings and bordered article cards; refined read/problem buttons with inset line, arrow, elevation, and hover lift; allowed Google font origins in CSP to avoid production console errors.
typography evidence: NOWNESS body/nav/title samples render as `futura-pt, Helvetica, Arial, sans-serif`; MathZine nav/hero/buttons/labels/cards now compute to `futura-pt, "Futura PT", Helvetica, Arial, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`; `.mz-wordmark` remains `"Old English Text MT", "Lucida Blackletter", Georgia, serif`.
runtime evidence: CSS chunk loaded as `text/css`; browser console logs were empty; desktop `scrollWidth` equals `clientWidth` at 1440px; browser-comment viewport `scrollWidth` equals `clientWidth` at 795px/835px; mobile `scrollWidth` equals `clientWidth` at 390px; fractal hero image loaded from `/mathzine-media/hero-fractal-symbols.png` as `image/png` at natural size 2400x1350; previous `hero-sine-observatory.png` was not used by rendered images; hero play button count is 0; mobile-only hero copy count is 0; hero copy rect stays inside the hero image rect in all checked viewports; header studio/problem icon renders as a pencil instead of a play triangle; automatic cover check rendered 4 fallback covers, 4 SVG math layers, 16 equation glyphs, 8 orbit layers, 0 duplicate external issue labels, and visible issue/meta text inside the selected 3호 cover at 835px; rail and latest cover measured ratios are both `0.70707`, matching target `210 / 297`; archive separation check rendered 3 issue groups and 5 bordered article cards at 795px; rail rendered 3 issue cards and 0 sample images.

**Findings**

- [P3] Hero asset is mathematical editorial art rather than NOWNESS's film photography
  Location: homepage hero media.
  Evidence: NOWNESS uses human film still photography; MathZine now uses a generated luminous sine/observatory visual.
  Impact: the layout matches and the asset is richer, but the content category is intentionally mathematical rather than film/editorial portraiture.
  Fix: future asset pass can use photographed math objects or staged editorial photography while keeping the current frame, overlay, and button geometry.

- [P3] Desktop utility strip adds app-specific density
  Location: header below primary nav.
  Evidence: NOWNESS has masthead and nav only; MathZine also shows date plus login/signup to preserve account access.
  Impact: slightly less minimal than the reference, but functional and not visually broken.
  Fix: move auth actions into a profile popover later if closer source fidelity is desired.

**Open Questions**

- None blocking. The blackletter MathZine masthead is treated as an intentional brand constraint.

**Implementation Checklist**

- NOWNESS-style centered masthead and icon actions implemented.
- Thin uppercase nav implemented with MathZine routes.
- Dominant static mathematical hero implemented with fractal/symbol artwork and live lead article title/deck overlaid on the image.
- Horizontal rail implemented from live issue data and issue cover source.
- Issue, ranking, popular article, board, and archive modules implemented from existing homepage data.
- Missing issue covers render as mathematical generated covers instead of plain diagonal placeholders.
- Issue covers use actual magazine-cover ratio and uploaded cover images preserve aspect ratio inside the cover frame.
- Archive is grouped by issue with visible dividers and bordered article cards.
- Browser-comment and mobile hero overlays, full-width action buttons, horizontal rail, and no overflow verified.
- NOWNESS-like font metrics verified on desktop and mobile; mobile `scrollWidth` equals `clientWidth`.
- Sample thumbnail images removed from the homepage path; cover placeholders are code-native and will be replaced by uploaded `coverImageSrc`.
- Buttons visually upgraded and verified in production screenshots.

**Follow-up Polish**

- Upload real cover images for each issue so the rail shows production covers instead of generated placeholders.
- Move login/signup into an icon popover to remove the desktop account strip.

final result: passed
