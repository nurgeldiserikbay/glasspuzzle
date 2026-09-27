# Glass Puzzle — бриф на дизайн

Как пользоваться: загрузите в ChatGPT `screens/overview-after.png` — все
экраны на одной картинке с подписями — или отдельные кадры из `screens/after/`
(раскладка новая, её надо сохранить) и вставьте нужный промпт из раздела «Промпты».
Промпты на английском: генератор картинок понимает их точнее. Кадры
`screens/before/` приложите, только если хотите показать, от чего уходим.

Кадры пересъёмка одной командой после сборки:
`node _docs/design/make-design-shots.mjs after`

---

## 1. Что за игра

**Glass Puzzle** — спокойный пазл для телефона. Игрок видит фотографию, она
трескается, как стекло, и осколки улетают в ящики внизу экрана. Из ящиков
осколки по одному перетаскивают обратно на рамку, пока картинка не соберётся.

- **Аудитория:** дети от 5 лет и взрослые — «пазл перед сном». Google Play,
  раздел «для всей семьи».
- **Настроение:** утро, тишина, уют. Не «стекло разбилось, опасно», а «витраж
  собирается обратно». Ничего резкого, тёмного, агрессивного.
- **Референс стиля:** Tile Club (и соседи по жанру: Tile Explorer, Zen Match) —
  светлые пастельные фоны, пухлые «плиточные» кнопки с толщиной снизу,
  мягкие скругления, рисованный мультяшный декор.

## 2. Как устроен уровень

1. Картинка показывается целиком около секунды.
2. По ней проходят трещины, поле вздрагивает, осколки чуть расходятся.
3. Осколки улетают вниз, каждый в свой ящик. Ящики стоят лентой, лента
   листается пальцем вбок.
4. Игрок тянет осколок из ящика вверх, на стол — поле над лотком.
5. **Осколки склеиваются друг с другом.** Два куска (или две группы)
   сливаются, если в картинке они были соседями, повёрнуты одинаково и
   положены рядом так, как стояли в картинке. Склейка — с искрами, дальше
   группа двигается и поворачивается целиком.
6. На столе может лежать **не больше трёх групп** (одиночный кусок — тоже
   группа). Новый кусок из ящика, который ни к чему не прилип, при полном
   столе возвращается обратно, а плашка «Table» краснеет и вздрагивает. Каждая
   склейка освобождает место.
7. Одиночный кусок можно вернуть в ящик; собранную группу — нет.
8. Когда всё слилось в одну картинку, она встаёт в рамку и появляется карточка
   «Well done!» с картинкой и временем.

Сложности:

| Сложность | Осколков | Поворот | Рамка |
|---|---|---|---|
| Easy | 12 | нет | контуры мест; кусок, брошенный на своё место, защёлкивается |
| Medium | 20 | тап поворачивает на 90° | нет, всё поле — стол |
| Hard | 30 | тап поворачивает на 90° | нет, всё поле — стол |

Сама картинка во время игры не видна ни на одной сложности — только пока
зажата кнопка «подсмотреть».

## 3. Экраны

| Кадр | Экран | Что на нём |
|---|---|---|
| `01-start` | Старт | логотип, кнопка Play, ссылка Privacy Policy, значок «другие игры» в углу |
| `02-levels` | Выбор картинки | сетка 3 в ряд: пройдена (галочка), следующая (солнечная рамка), закрыта (серая, замок) |
| `03-difficulty` | Выбор сложности | три большие кнопки с подписью, сколько кусков |
| `04-play-whole` → `04b` → `04c` | Начало уровня | целая картинка → трещины → осколки летят в ящики |
| `05-play-broken` | Игра | шапка (назад, счётчик осколков, время, «подсмотреть»), рамка с контурами (на Easy), плашка «Table», лента ящиков |
| `06-play-progress` | Игра, середина | часть осколков собрана |
| `07-play-bench-full` | Игра, стол занят | на столе три группы, квадратики «Table» красные |
| `08-win` | Победа | карточка «Well done!», собранная картинка, время, «домой» и «Next» |
| `09-medium-start` | Medium, начало | рамки нет, всё поле — стол; подсказка «как собирать» |
| `10-medium-table` | Medium, игра | склеенная группа и одиночные куски на столе, стол полон |

Низ экрана (тёмная полоса) — реклама, её не рисуем и под неё не заходим.

## 4. Визуальный язык

**Палитра** (уже в коде, `src/style.scss`). Если GPT предложит свою, это
нормально: я перенесу её в переменные.

| Роль | Цвет | Где |
|---|---|---|
| Небо сверху | `#AEE0F5` | фон |
| Небо снизу | `#E4F6EA` | фон |
| Текст | `#3B3D6B` | цифры, заголовки на кремовом |
| Крем | `#FFFAF0`, кромка `#ECD6AE`, толщина `#E0C08E` | карточки, ящики, лоток |
| Мята | `#7FD6A8` / `#3FA877` | главное действие (Play, Next, Easy) |
| Небесный | `#7CCBF0` / `#3A9CCC` | второстепенное (домой, Medium) |
| Коралл | `#FF9A84` / `#E2654D` | «трудно», «стоп» (Hard, стол полон) |
| Солнце | `#FFD46B` / `#E3A634` | подсказка, «подсмотреть», заголовок победы |

**Правила:**

- Светлая база, никакого чёрного. Насыщенный цвет — только на том, что
  нажимается или что-то значит (сложность, «стол полон»).
- У каждой кнопки и карточки видимая кромка и **плотная тень-толщина снизу**
  (не размытая): предмет, который можно нажать.
- Скругления крупные, но не «таблетки» на всём подряд: 14–20 px на телефоне.
- Иконки рисованные, контурные, одной толщины. Без эмодзи.
- Шрифт — Luckiest Guy (пухлый мультяшный, только латиница).
- Стекло — это светлая белая кромка и голубоватая толщина осколка. Не хром,
  не неон, не глянцевые блики.

## 5. Что сгенерировать

Интерфейс (кнопки, ящики, рамка, плашки) рисуется кодом, поэтому **надписи и
кнопки картинками не нужны**. Осколки режутся из фотографий уровня. Картинками
нужны только декор и бренд:

| # | Ассет | Размер | Формат | Заметки |
|---|---|---|---|---|
| 1 | Фон игры | 1080×1920 (9:16) | PNG/WebP без прозрачности | спокойный, без мелких деталей в центре: там рамка и лоток |
| 2 | Фон стартового экрана | 1080×1920 | PNG/WebP | можно богаче: витражное окно, облака, растения |
| 3 | Логотип «Glass Puzzle» | 1200×600 | PNG с прозрачностью | заменяет нынешний хромовый |
| 4 | Маскот (по желанию) | 800×800 | PNG с прозрачностью | для старта и карточки победы; 2 позы: машет и радуется |
| 5 | Иконка приложения | 512×512 | PNG без прозрачности | без текста, читается в 48 px |
| 6 | Обложка Google Play | 1024×500 | PNG/JPG | логотип + сцена сборки витража |

Готовые файлы положите в `_docs/design/assets/` — я подключу их и пересниму
экраны.

## 6. Промпты

### 6.1. Общий стиль (вставлять перед любым промптом ниже)

```
Style: cozy casual mobile puzzle game in the spirit of "Tile Club" and "Zen Match".
Soft pastel palette: morning sky blue (#AEE0F5) fading to mint cream (#E4F6EA),
warm cream (#FFFAF0) surfaces with tan edges (#ECD6AE), accents in mint (#7FD6A8),
sky blue (#7CCBF0), coral (#FF9A84) and sunny yellow (#FFD46B), deep indigo text (#3B3D6B).
Chunky "tile" look: every button and card has a visible solid edge and a flat solid
drop-thickness underneath (no blurry shadows). Rounded corners, friendly cartoon shapes,
hand-drawn outline icons. Calm, soothing, suitable for kids 5+ and adults.
No dark backgrounds, no neon, no chrome, no glossy highlights, no emoji.
```

### 6.2. Перерисовать экран (для каждого кадра `screens/after/*.png`)

```
Redesign this mobile game screen in the style above. Keep the exact layout,
element positions and sizes from the screenshot: top bar, the picture frame in
the middle, the "Table" tab and the scrolling tray of boxes at the bottom.
Keep all text as it is. The dark strip at the very bottom is an ad banner:
leave it untouched. Portrait 9:16, 1080x1920.
```

### 6.3. Фон игры

```
Portrait background for a cozy puzzle game, 1080x1920, no text, no characters.
Soft morning sky with a few fluffy cartoon clouds at the top, gentle gradient to mint
cream at the bottom, faint sparkles and tiny stained-glass shards floating near the edges
like confetti. The center and lower third must stay calm and empty (a picture frame and a
tray of boxes will be placed there). Flat vector illustration, pastel, soothing.
```

### 6.4. Фон стартового экрана

```
Portrait title-screen background for a cozy puzzle game "Glass Puzzle", 1080x1920, no text.
A sunny windowsill with a big round stained-glass window being reassembled: a few colorful
glass pieces are floating back into place with little sparkles. Potted plants, soft clouds
outside. Leave the upper-middle area clear for the logo and the lower-middle clear for a
big Play button. Flat cartoon vector style, pastel, warm and calm.
```

### 6.5. Логотип

```
Game logo reading "GLASS PUZZLE", two lines, chunky rounded cartoon letters.
Letters look like thick candy-colored stained glass (mint, sky blue, coral, sunny yellow)
with soft white outlines and a solid darker thickness underneath, a couple of small glass
shards and sparkles popping around. Friendly, for kids and adults. Transparent background,
1200x600, centered, no extra text.
```

### 6.6. Маскот (по желанию)

```
Cute mascot for a cozy puzzle game: a small round glass-blower character (or a friendly
little owl) holding a colorful stained-glass shard. Big eyes, simple shapes, pastel colors
matching the palette, thick soft outline. Two poses on transparent background: waving hello,
and cheering with both arms up. 800x800 each, flat cartoon vector.
```

### 6.7. Иконка приложения

```
Mobile app icon 512x512, no text. A round stained-glass window made of a few big colorful
pieces (mint, sky blue, coral, sunny yellow), one piece floating slightly out of place with
a sparkle, on a soft sky-blue background. Chunky tile style with solid thickness under the
pieces, readable at small size, flat cartoon vector.
```

### 6.8. Обложка Google Play

```
Google Play feature graphic 1024x500. Left: the "GLASS PUZZLE" logo in chunky stained-glass
letters. Right: a phone-free scene of a picture (a sunflower photo) being reassembled from
glass pieces flying out of a row of cream wooden boxes. Soft sky background with clouds,
pastel, calm, cartoon vector. No other text.
```

## 7. Чего не делать

- Не рисовать кнопки с запечённым текстом: подписи ставит код, и их придётся
  переводить.
- Не рисовать осколки: они вырезаются из фотографии уровня.
- Не возвращаться к тёмному фону с хромом: от этого и уходим.
- Не менять раскладку игрового экрана: размеры рамки и лотка считает код, и
  механика завязана на них.
