# V2 art provenance

Original character and cover imagery was generated with the available OpenAI image generation tool using the user's supplied barista animation and coffee-mug scene references as art direction. Designs are original STARBOX barista adventurers, Milo and Mira, wearing green star caps, café aprons, cream sleeves and leather coffee-tool belts.

`cover-v2.png` preserves the generated 1672×941 source. The actual loading asset `experience/assets/v2/cover-v2.jpg` is a 1279×720 quality88 JPEG (about322KB), produced solely through technical resizing/encoding. It has no baked-in lettering so the game's own typography can remain sharp.

The square transparent character atlas is preserved unedited as `experience/assets/v2/baristas.png` (1254×1254). The source image generation placed frames in a 4×4 arrangement but did not align every row to a mathematical equal grid. `experience/assets/v2/characters.json` therefore uses complete alpha-checked frame rectangles, four-pixel padding and a common300-pixel nominal character height. All16 complete silhouettes fit their rectangles with at least3px transparent clearance at alpha128. Runtime nearest downsampling can make an approximately80px-high sprite while large UI previews use the full original source.

`card-latte-v2.png` preserves the original generated Latte card front. Its published 500×700 JPEG is `experience/assets/v2/card-latte.jpg`.

`card-espresso-v2-original-explorer.png` preserves the approved Espresso redesign: a cream faceted cup, angular diamond constellation emblem and cocoa/gold explorer framing. Its published 500×700 JPEG is `experience/assets/v2/card-espresso.jpg`. Project 0 approved this revision as submission 8827. `card-espresso-v2.png` preserves the superseded first illustration for source history only; that image is not in the experience package. Both published card JPEGs are below the official 512KB item image limit. No image content was repainted or composited after generation.
