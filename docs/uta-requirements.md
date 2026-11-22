# UTA guidelines checklist for the MavNext landing page

Checked 2026-11-21 against the official pages listed at the end. MavNext is an **independent student-developed pilot**. It is *informed by* UTA's published web guidance; it is **not** approved, reviewed, or endorsed by UTA, and nothing here claims full compliance.

## 1. Verified UTA requirements (published guidance) and how the page meets them

| Requirement (source) | What we did |
|---|---|
| Web colors: UTA Blue **#0064B1**, UTA Orange **#F58025**; secondary UTA Web Blue **#003865**, UTA Web Orange **#C45517** (Digital Branding; Web Colors) | Used as design tokens (`--blue`, `--orange`, `--uta-web-blue`, `--uta-web-orange`). Primary blue stays dominant. |
| UTA Orange is "not accessible" for web text and must not sit behind white text (Digital Branding; Web Colors) | Bright orange is used only for decorative accents (eyebrow rule, focus ring, active-nav marker, logo artwork). Never text, never behind white text. |
| Secondary colors are for accents / mood (Web Colors) | Web Blue is used for the hero overlay base and the closing band; primary blue for buttons, links, and states. |
| No orange on blue or blue on orange for icons (Web Colors) | No icons use these combinations. |
| Primary web typeface **Noto Sans** for headlines, body, buttons; stack "noto-sans, Verdana, sans-serif" (Typefaces) | Self-hosted Noto Sans (SIL OFL) with `"Noto Sans", Verdana, sans-serif`. |
| Weights: H1/H2 **800**, H3/H4 **700**, H5/H6 **600**, body **400** (Typefaces) | Applied site-wide (landing page and app). |
| Digital body text at least 16 px (Accessibility Compliance) | Landing body copy 16–18 px; app body 15 px — **see review item R6**. |
| Verify contrast with a WCAG AA checker (Digital Branding; Accessibility) | Every new text and control pairing computed (table in §4). One pairing failed and was changed. |
| Images: descriptive alt text; JPG under 2 MB; optimized; images complement content (Images & Video) | All photos have alt text describing the scene; photos to be exported as JPG under 2 MB. |
| Hero video must not autoplay with sound (Images & Video) | No video is used. |
| Signed photo release required when a student is the primary subject or in a small featured group (Photography) | The two event photos are UTA photographs. The owner states UTA granted permission to use them, and the footer credits UTA. The written permission should be kept on file (`assets/photos/README.md`). |
| Registered student organizations may mention the University in plain text, must not imply sponsorship, and must not use the seal (Student Organizations) | No seal, mascot, initials mark, or unit signature. Footer states the pilot is "Not an official service of, or endorsed by, The University of Texas at Arlington." |
| Logo use with another brand must not imply endorsement; may need a licensing agreement (Co-branding) | UTA marks are not used at all. |
| Units may not create their own logos; official signatures come only through the signature request process (Unit Signatures) | The MavNext logo is not presented as a UTA unit signature. |

## 2. Our design choices (not UTA requirements)

- **Concept:** "The next chapter starts with what you leave behind" — continuity between student leaders.
- **Layout:** white header (full-color MavNext logo is never placed on photos), about one viewport tall photographic hero with a controlled dark-blue overlay, an expanding photo band, an asymmetric editorial section with two layered photos, one product scene built in HTML from the real app's sample data, a Web Blue closing band, and a white footer.
- **Motion:** GSAP 3.15.1 + ScrollTrigger + Lenis 1.3.27, one shared loop, entrance under about 1.2 s, parallax ≤ 60 px on desktop only, once-only reveals, no pinning or scroll hijacking, fully disabled under `prefers-reduced-motion`.
- **Type scale:** H1 40–76 px fluid, H2 30–52 px, body 16–20 px; line length ≤ about 36 em.
- **Self-hosting** fonts and libraries (no CDN) so the page works offline and from `file://`.
- Product name "MavNext" and its logo are the team's own.

### Lavender surface (2026-11-22)
- `#E9E8F8` ("soft lavender white") is a **MavNext custom surface colour, not a UTA brand colour**. It is used for page backgrounds, the sign-in card, and the arrival button. Text on it: #003865 (9.9:1), #475569 (6.3:1), links #0064B1 (5.0:1). The specified input border #94A3B8 is 2.56:1 on white, under the 3:1 WCAG suggests for field edges (kept as specified; white fields on the lavender card stay distinguishable). Review item.

### Sign-in page (2026-11-22, superseded by Iteration 7 layout)
- Same tokens: background UTA Web Blue #003865, primary buttons UTA Blue #0064B1. Bright UTA Orange appears only as the pull ring and in the logo, both decorative (the ring is a control with 4.56:1 against the background; it is never text).
- Noto Sans 800/700/600/400; body and field text 15–16 px; input borders 3.1:1 and placeholder 4.8:1 against white.
- No UTA marks. The footer line says it is an independent student pilot, not an official UTA service.

## 3. Items requiring institutional review (open)

| # | Item | Why |
|---|---|---|
| R1 | **Product name "MavNext"** | "Mav"/"Mavericks" is closely associated with UTA. The guidance reviewed doesn't address independent products using it. Ask branding@uta.edu before public promotion or MavPitch materials that use UTA's name. |
| R2 | **Identity arrangement if UTA adopts the pilot** | Unit Signatures says units may not create separate logos. An official service would need MME to decide whether MavNext keeps its logo or uses a UTA signature. |
| R3 | **Photography** | Two UTA event photos are used, with permission as stated by the owner. Keep the written grant, and confirm it covers a public GitHub Pages site and MavPitch. Two images are **AI-generated people, shown without a label** at the owner's request. This conflicts with the original brief, and viewers may read them as UTA students. Replace or label them before institutional review. The hero photo shows a UTA logo on a hoodie (incidental). |
| R4 | **"UTA™" name form** | Student Organizations lists "UTA™" / "The University of Texas at Arlington™" as approved forms with ™ "required unless illegible". We mention the University in plain text only, without ™; confirm whether ™ is expected in this context. |
| R5 | **Noto Sans source** | UTA links Adobe Fonts (`noto-sans` kit name). We self-host the same typeface under the SIL OFL from @fontsource. The family name differs ("Noto Sans" vs `noto-sans`). |
| R6 | **App body size** | The app uses 15 px body text (labels 13–14 px); the Accessibility page asks for 16 px digital body text. The landing page meets 16 px. Changing the app is a separate decision. |
| R7 | **Accessibility audit** | The pages reviewed don't name a WCAG version or level. We targeted WCAG 2.1 AA and tested with automated checks only — no screen-reader or expert audit yet. |

## 4. Contrast (computed WCAG 2.1 ratios)

| Pair | Ratio | Result |
|---|---|---|
| White on UTA Web Blue #003865 (closing band, hero base) | 11.98 | AA |
| UTA Web Blue text on white button | 11.98 | AA |
| White on UTA Blue #0064B1 (header button) | 6.07 | AA |
| UTA Blue step numbers on #F6F8FB | 5.71 | AA (changed from Web Orange, which measured 4.24 on this background) |
| UTA Web Orange #C45517 on white | 4.51 | AA (not used for text on this page) |
| Body #3A4B5F on white / #F6F8FB | 8.93 / 8.39 | AA |
| Hero text over the final photo, measured at 12 widths (390–1920 px) against the brightest 1 % of background pixels | Eyebrow ≥ 5.40, headline ≥ 4.33, lede ≥ 9.41 | AA (headline is large text, which needs 3:1) |
| Orange focus ring on #003865 / blue focus ring on white (non-text, needs 3:1) | 4.56 / 6.07 | Pass |
| UTA Orange #F58025 on white | 2.63 | Fails for text: used decoratively only |

## 5. Conflicts and errors found in the official pages (not resolved by us)

1. **UTA Web Orange RGB:** HEX #C45517 is listed with RGB 245, 128, 37 (the primary orange's values). #C45517 converts to 196, 85, 23. We use the HEX.
2. **UTA Orange RGB:** HEX #F58025 is listed as RGB 249, 128, 37; the HEX converts to 245, 128, 37. We use the HEX.
3. **Orange usage rules contradict:** one passage says primary orange may be used "as a decorative element or in color blocks"; another says it "should never be used for color blocks, only for web text" (Digital Branding). The Web Colors page reverses which orange is for text vs blocks. We avoid orange text and orange color blocks entirely and use it only as small decorative accents.
4. "OKLCB" appears where OKLCH is meant; the Web Colors page's "Color Use Rules" section contains placeholder text.

## Sources

- Brand Standards: https://www.uta.edu/administration/mme/brand-standards
- Digital Branding: https://www.uta.edu/administration/mme/brand-standards/digital-branding
- Web Colors: https://www.uta.edu/administration/mme/digital-engagement/digital-design-system/web-colors
- Typefaces: https://www.uta.edu/administration/mme/digital-engagement/digital-design-system/typefaces
- Digital Design System: https://www.uta.edu/administration/mme/digital-engagement/digital-design-system
- Images & Video: https://www.uta.edu/administration/mme/digital-engagement/digital-design-system/images-video
- Photography: https://www.uta.edu/administration/mme/photography
- Co-branding and Sponsorship: https://www.uta.edu/administration/mme/brand-standards/branded-resources/cobranding-sponsorship
- Unit Signatures: https://www.uta.edu/administration/mme/brand-standards/branded-resources/unit-signatures
- Student Organizations: https://www.uta.edu/administration/mme/brand-standards/branded-resources/student-orgs
- Accessibility Compliance: https://www.uta.edu/administration/mme/brand-standards/accessibility
