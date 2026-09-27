# Glass Puzzle — промпты на ассеты

Каждый промпт — для отдельного файла, вставляется в ChatGPT по одному. Если
генерируете в том же чате, где GPT рисовал экраны (`screens-examples`), стиль
уже задан; если в новом — сначала приложите эти экраны и вставьте блок «Стиль».

Готовые файлы — в `_docs/design/assets/` с именами из заголовков.

**Прозрачность.** У файлов, помеченных «прозрачный фон», проверьте, что фон
действительно прозрачный, а не нарисованная «шахматка». Если шахматка — ответьте
GPT: `Export again as PNG with real alpha transparency, no checkerboard.`

---

## Стиль (вставлять первым в новом чате)

```
Art style for all assets of the mobile game "Glass Puzzle": cozy, sunny, soft pastel,
painted cartoon illustration like the attached screens. Warm morning sunlight, soft bokeh,
candy-colored stained glass (sunny yellow, mint green, sky blue, coral red) with cream
edges. Friendly for kids 5+ and adults. No dark or gloomy tones, no neon, no chrome.
Never add text, letters, numbers, buttons, UI or watermarks unless asked.
```

---

## 1. `bg-start.png` — фон стартового экрана

```
Portrait background for the title screen, exactly 1080x1920, no text, no buttons, no UI.
A sunny windowsill seen from inside a cozy room: open window with a garden, trees and a
small village far away, soft clouds and sunbeams. On the left a white pot with green
leaves and small white flowers, on the right a stack of two pastel books. In the upper
half, centered, a big round stained-glass window with a sunflower (yellow petals, green
leaves, blue sky pieces) in a cream frame; a few glass pieces are slightly cracked.
Keep the area around the window's center clear — a logo will be placed on top of it.
The lower 30% (the wooden sill) is calm and empty — a big Play button goes there.
```

## 2. `bg-levels.png` — фон выбора картинок

```
Portrait background for a level-select screen, exactly 1080x1920, no text, no UI.
Bright soft blue sky with fluffy clouds; branches with white blossoms and green leaves
coming in from the top-left and top-right corners; at the bottom a blurred sunny meadow
with soft bokeh and a few petals floating. The whole middle area must stay calm, light
and low-detail — a grid of picture cards will cover it.
```

## 3. `bg-play.png` — фон игрового экрана

```
Portrait background for the gameplay screen, exactly 1080x1920, no text, no UI.
Same sunny room as the title screen but seen closer: window frame on the sides, garden
outside, potted plants in the lower corners, a wooden sill at the bottom. Make it softer,
more blurred and lower in contrast than the title screen — puzzle pieces and a picture
frame will sit on top and must stand out clearly. Nothing important in the middle.
```

## 4. `logo.png` — логотип

```
Game logo, transparent background, 1200x700. Only the words "GLASS PUZZLE" in two lines
("GLASS" on top, "PUZZLE" below), centered. Chunky rounded cartoon letters made of
candy-colored stained glass — each letter a different color (blue, yellow, red, green),
with thin crack lines inside, a thick cream outline and a soft darker thickness
underneath. A few tiny sparkles. No window, no background, no other text.
```

## 5. `gem-1.png` … `gem-6.png` — стеклянные самоцветы

Лучше по одному промпту на файл — так GPT точнее держит форму и размер.
Шаблон, в котором меняется только описание формы:

```
A single faceted glass gem shard for game decoration, transparent background, 256x256,
centered with small padding. Glossy candy stained glass with a cream rounded edge,
bright highlight on top, soft shadow below. Shape and color: <ФОРМА>.
Nothing else in the image.
```

| Файл | Вместо `<ФОРМА>` |
|---|---|
| `gem-1.png` | `sky-blue triangle pointing up-right` |
| `gem-2.png` | `mint-green triangle pointing right` |
| `gem-3.png` | `sunny-yellow rhombus, tall` |
| `gem-4.png` | `orange-to-coral-red triangle pointing left` |
| `gem-5.png` | `light-blue rhombus, wide and flat` |
| `gem-6.png` | `golden-yellow triangle pointing down` |

## 6. `flowers-left.png` и `flowers-right.png` — цветы в углы карточек

```
Small corner decoration, transparent background, 400x300: a bouquet of fresh green
leaves with two white five-petal flowers with yellow centers and one tiny sparkle.
It will sit on the top-left corner of a cream card, so the bouquet grows from the
bottom-right toward the top-left. Soft painted cartoon style, nothing else in the image.
```

Затем — зеркальную пару:

```
Now the same bouquet mirrored horizontally for the top-right corner, same size 400x300,
transparent background.
```

## 7. `icon.png` — иконка приложения

```
Mobile app icon, 512x512, square, no text, no rounded mask (the store rounds it).
A round stained-glass sunflower window in a cream frame on a soft sky-blue background,
one glass piece popping slightly out of place with a sparkle. Big simple shapes, strong
contrast, readable at 48x48.
```

## 8. `feature.png` — обложка Google Play (по желанию)

```
Google Play feature graphic, exactly 1024x500. Left half: empty soft area (the logo will
be placed there later). Right half: the sunny windowsill scene with the round
stained-glass sunflower window, a few colorful glass pieces flying back into place, a
row of cream boxes with pieces below. No text.
```
