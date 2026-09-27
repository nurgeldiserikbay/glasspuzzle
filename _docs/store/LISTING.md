# Glass Puzzle — тексты для Google Play

Лимиты Play: название — 30 символов, краткое описание — 80, полное — 4000.
Длины ниже посчитаны.

Картинки:
- иконка 512×512 — `icon-512.png`;
- обложка 1024×500 — `feature-1024x500.png`;
- скриншоты — `screenshots/phone`, `screenshots/tablet7`, `screenshots/tablet10`
  (по 7 кадров, 9:16).

Пересобрать картинки: `node _docs/store/make-store-assets.mjs`,
скриншоты — `node _docs/store/make-store-shots.mjs` (после сборки
`vite build --mode development`).

---

## English (en-US)

**Title** (27): `Glass Puzzle: Stained Glass`

**Short description** (79):
`Watch a picture shatter, then join the glass pieces back together. Calm & cozy.`

**Full description:**

```
A beautiful picture shatters like glass — and you put it back together, piece by piece.

Glass Puzzle is a calm, cozy jigsaw for kids and grown-ups. Every level starts with a whole picture: it cracks, the shards fly into little wooden boxes, and your job is to join them again.

HOW TO PLAY
• Pull a shard out of its box and place it on the table.
• Pieces that belong together snap into one — move and turn them as a group.
• Only three loose groups fit on the table, so think before you pick.
• Join everything into one picture to finish the level.

THREE WAYS TO PLAY
• Easy — 12 pieces with a frame that shows where each piece goes. Great for kids.
• Medium — 20 pieces, some turned around. Tap a piece to rotate it.
• Hard — 30 pieces, no frame, just you and the picture.

WHY YOU'LL LIKE IT
• Dozens of bright photos: flowers, animals, landscapes.
• Soft stained-glass look, gentle music-box melodies and glassy sounds.
• No lives and no time limits — play at your own pace.
• Music and sounds can be switched off separately.
• Works offline.

Made for the whole family. Relax, look closely, and piece the world back together.
```

**What's new:**

```
• New puzzle mechanic: join matching pieces into groups.
• Fresh cozy stained-glass design.
• Calm music-box melodies and new sounds (can be turned off).
• Smoother dragging and many small fixes.
```

---

## Русский (ru-RU)

**Название** (25): `Glass Puzzle: витраж-пазл`

**Краткое описание** (77):
`Картинка разбивается, как стекло, — соберите её снова. Спокойный уютный пазл.`

**Полное описание:**

```
Красивая картинка разбивается, как стекло, — а вы собираете её обратно, осколок за осколком.

Glass Puzzle — спокойный уютный пазл для детей и взрослых. Каждый уровень начинается с целой картинки: она трескается, осколки разлетаются по маленьким деревянным ящикам, и их нужно снова соединить.

КАК ИГРАТЬ
• Достаньте осколок из ящика и положите на стол.
• Подходящие друг к другу куски склеиваются в одну группу — её можно двигать и поворачивать целиком.
• На столе помещается не больше трёх групп, так что выбирайте с умом.
• Соберите всё в одну картинку — уровень пройден.

ТРИ СЛОЖНОСТИ
• Лёгкая — 12 кусков и рамка с контурами мест. Отлично для детей.
• Средняя — 20 кусков, некоторые повёрнуты. Нажмите на кусок, чтобы повернуть.
• Сложная — 30 кусков и никакой рамки.

ПОЧЕМУ ЭТО ПРИЯТНО
• Десятки ярких фотографий: цветы, животные, пейзажи.
• Мягкий витражный стиль, тихие мелодии музыкальной шкатулки и стеклянные звуки.
• Ни жизней, ни ограничения по времени — играйте в своём темпе.
• Музыку и звуки можно выключить отдельно.
• Работает без интернета.

Для всей семьи. Расслабьтесь, присмотритесь — и соберите мир обратно.
```

**Что нового:**

```
• Новая механика: подходящие куски склеиваются в группы.
• Новый уютный витражный дизайн.
• Спокойные мелодии и новые звуки (можно выключить).
• Плавнее перетаскивание и много мелких исправлений.
```

---

## Что проверить в Play Console перед отправкой

- **Контент приложения → Целевая аудитория:** включает детей — как и раньше.
  Реклама в коде уже соответствует Families policy (детские флаги AdMob, `npa`,
  без `AD_ID`).
- **Рекламный идентификатор:** ответить «не используется». Разрешение `AD_ID`
  вырезано намеренно, предупреждение Play об этом ожидаемо.
- **Реклама:** «содержит рекламу» — да.
- **Безопасность данных:** без изменений — новых данных игра не собирает
  (прогресс и настройки звука хранятся только на устройстве).
- **Политика конфиденциальности:** ссылка та же, что на стартовом экране.
- **AdMob:** рейтинг контента объявлений G и заблокированные чувствительные
  категории — на уровне аккаунта или этого приложения.
