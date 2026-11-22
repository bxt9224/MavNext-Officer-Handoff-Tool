# Lamp layers (arrival + sign-in)

| File | What it is |
|---|---|
| `lamp_off.webp` | The matte-white desk lamp, bulb off, on a transparent background (726 × 835). |
| `lamp_lit.webp` | Only the lit shade interior and bulb, aligned pixel-for-pixel to `lamp_off.webp`. It is faded in on top. |

**Source:** cut out of the two design mockups supplied by the project owner on 2026-11-22 ("Refined_UTA_hero_with_lavender_header.png", "Lavender_UTA_sign-in_under_soft_lamp.png"). Those mockups appear to be AI-generated images; there is no photographer or stock licence behind them. The lamp was separated from the blue background with colour-difference (blue-screen) matting. The lit shade was shifted 2.5 px / −4.7 px so the arm and base never move.

The cord, the orange ring, the beam and the glow are live HTML/CSS (`js/auth-scene.js`, `style.css`), not part of these images.

**Limits:** the source mockups are about 1585 px wide, so on high-density (Retina) screens the lamp is slightly soft when shown larger than about 835 px tall. For a public launch, replace both files with a licensed, high-resolution photo or 3D render of a similar lamp, exported the same way (an "off" layer, plus a matching "lit interior" layer). Then update the cord, ring and opening coordinates at the top of `js/auth-scene.js`.
