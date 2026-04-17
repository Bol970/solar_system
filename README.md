# Solar System Practice

Практическое задание с полноэкранной упрощённой схемой солнечной системы на `Three.js` и публикацией в `here.now`.

## Где именно используется Three.js

- Импорт библиотеки и `OrbitControls`: `site/main.js`
- Создание `WebGLRenderer`, `Scene` и `PerspectiveCamera`: `site/main.js`
- Солнце, орбиты, планеты, кольцо Сатурна и звёздный фон: `site/main.js`
- Анимация движения планет по орбитам: `site/main.js`

## Структура

- `site/index.html` — полноэкранная разметка и overlay
- `site/styles.css` — fullscreen-оформление
- `site/main.js` — вся 3D-сцена на Three.js
- `scripts/publish-herenow.sh` — публикация папки сайта через API here.now
