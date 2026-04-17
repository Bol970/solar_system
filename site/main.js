import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

const canvas = document.getElementById("scene")
const resetButton = document.getElementById("reset-view")
const planetName = document.getElementById("planet-name")
const planetSubtitle = document.getElementById("planet-subtitle")
const planetDescription = document.getElementById("planet-description")
const planetFacts = document.getElementById("planet-facts")
const planetPicker = document.getElementById("planet-picker")
const moonSection = document.getElementById("moon-section")
const moonSectionTitle = document.getElementById("moon-section-title")
const moonPicker = document.getElementById("moon-picker")

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
})

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
document.body.classList.add("scene-ready")

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x040814, 0.009)

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400)
const overviewCameraPosition = new THREE.Vector3(0, 36, 19)
const overviewTarget = new THREE.Vector3(0, 0, 0)
camera.position.copy(overviewCameraPosition)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 22
controls.maxDistance = 85
controls.minPolarAngle = Math.PI * 0.15
controls.maxPolarAngle = Math.PI * 0.48
controls.target.copy(overviewTarget)
controls.saveState()

scene.add(new THREE.AmbientLight(0xa8bfd9, 0.28))

const sunLight = new THREE.PointLight(0xffc66f, 220, 180, 2)
scene.add(sunLight)

const fillLight = new THREE.DirectionalLight(0x93b8ff, 0.8)
fillLight.position.set(-20, 30, 16)
scene.add(fillLight)

const solarSystem = new THREE.Group()
scene.add(solarSystem)

function hexToCss(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`
}

function hashString(value) {
  let hash = 1779033703 ^ value.length

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  return hash >>> 0
}

function mulberry32(seed) {
  let value = seed >>> 0

  return () => {
    value += 0x6d2b79f5
    let result = Math.imul(value ^ (value >>> 15), 1 | value)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function randomRange(random, min, max) {
  return min + (max - min) * random()
}

function createCanvasTexture(width, height, painter) {
  const textureCanvas = document.createElement("canvas")
  textureCanvas.width = width
  textureCanvas.height = height

  const context = textureCanvas.getContext("2d")
  painter(context, width, height)

  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  texture.needsUpdate = true

  return texture
}

function addSpeckles(context, random, width, height, color, count, minRadius, maxRadius, alpha) {
  context.fillStyle = color
  context.globalAlpha = alpha

  for (let index = 0; index < count; index += 1) {
    const x = random() * width
    const y = random() * height
    const radius = randomRange(random, minRadius, maxRadius)

    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  context.globalAlpha = 1
}

function addCraters(context, random, size, color, highlightColor, count, minRadius, maxRadius) {
  for (let index = 0; index < count; index += 1) {
    const x = random() * size
    const y = random() * size
    const radius = randomRange(random, minRadius, maxRadius)

    context.fillStyle = color
    context.globalAlpha = randomRange(random, 0.15, 0.32)
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()

    context.strokeStyle = highlightColor
    context.lineWidth = Math.max(1, radius * 0.12)
    context.globalAlpha = 0.16
    context.beginPath()
    context.arc(x - radius * 0.12, y - radius * 0.12, radius * 0.8, Math.PI * 1.05, Math.PI * 1.8)
    context.stroke()
  }

  context.globalAlpha = 1
}

function createRockyTexture({ seed, base, accent, shadow, crater }) {
  return createCanvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(hashString(seed))
    const gradient = context.createLinearGradient(0, 0, 0, height)

    gradient.addColorStop(0, hexToCss(base))
    gradient.addColorStop(0.55, hexToCss(accent))
    gradient.addColorStop(1, hexToCss(shadow))

    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    for (let index = 0; index < 90; index += 1) {
      const patchWidth = randomRange(random, width * 0.04, width * 0.18)
      const patchHeight = randomRange(random, height * 0.03, height * 0.12)
      const x = random() * width
      const y = random() * height

      context.fillStyle = random() > 0.5 ? hexToCss(accent) : hexToCss(shadow)
      context.globalAlpha = randomRange(random, 0.08, 0.18)
      context.beginPath()
      context.ellipse(x, y, patchWidth, patchHeight, random() * Math.PI, 0, Math.PI * 2)
      context.fill()
    }

    addSpeckles(context, random, width, height, "#ffffff", 1200, 0.3, 1.5, 0.06)
    addCraters(context, random, height, hexToCss(crater), "rgba(255,255,255,0.9)", 54, 6, 28)
    context.globalAlpha = 1
  })
}

function createGasTexture({ seed, colors, spot }) {
  return createCanvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(hashString(seed))
    const background = context.createLinearGradient(0, 0, 0, height)

    colors.forEach((color, index) => {
      background.addColorStop(index / Math.max(colors.length - 1, 1), hexToCss(color))
    })

    context.fillStyle = background
    context.fillRect(0, 0, width, height)

    for (let band = 0; band < 24; band += 1) {
      const y = (band / 24) * height
      const bandHeight = randomRange(random, 14, 34)

      context.fillStyle = hexToCss(colors[band % colors.length])
      context.globalAlpha = randomRange(random, 0.12, 0.24)
      context.beginPath()
      context.moveTo(0, y)

      for (let x = 0; x <= width; x += 32) {
        const wave = Math.sin(x * 0.018 + band * 0.9) * randomRange(random, 4, 12)
        context.lineTo(x, y + wave)
      }

      context.lineTo(width, y + bandHeight)
      context.lineTo(0, y + bandHeight)
      context.closePath()
      context.fill()
    }

    if (spot) {
      context.fillStyle = hexToCss(spot.color)
      context.globalAlpha = 0.46
      context.beginPath()
      context.ellipse(width * spot.x, height * spot.y, width * 0.11, height * 0.075, -0.18, 0, Math.PI * 2)
      context.fill()
    }

    addSpeckles(context, random, width, height, "#ffffff", 800, 0.4, 1.4, 0.03)
    context.globalAlpha = 1
  })
}

function createEarthTexture(seed) {
  return createCanvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(hashString(seed))
    const gradient = context.createLinearGradient(0, 0, 0, height)

    gradient.addColorStop(0, "#0f4597")
    gradient.addColorStop(0.45, "#2078c9")
    gradient.addColorStop(1, "#0b3768")

    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    const landColors = ["#6bb36c", "#7ab86a", "#8c9c52", "#4c8745"]

    for (let index = 0; index < 18; index += 1) {
      const x = random() * width
      const y = random() * height
      const radiusX = randomRange(random, 40, 110)
      const radiusY = randomRange(random, 18, 58)

      context.fillStyle = landColors[index % landColors.length]
      context.globalAlpha = randomRange(random, 0.5, 0.82)
      context.beginPath()
      context.ellipse(x, y, radiusX, radiusY, random() * Math.PI, 0, Math.PI * 2)
      context.fill()
    }

    for (let index = 0; index < 38; index += 1) {
      const x = random() * width
      const y = random() * height
      const radiusX = randomRange(random, 26, 92)
      const radiusY = randomRange(random, 8, 20)

      context.fillStyle = "#ffffff"
      context.globalAlpha = randomRange(random, 0.12, 0.26)
      context.beginPath()
      context.ellipse(x, y, radiusX, radiusY, random() * Math.PI, 0, Math.PI * 2)
      context.fill()
    }

    context.globalAlpha = 1
  })
}

function createIceTexture({ seed, base, accent, shadow }) {
  return createCanvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(hashString(seed))
    const gradient = context.createLinearGradient(0, 0, 0, height)

    gradient.addColorStop(0, hexToCss(base))
    gradient.addColorStop(0.55, hexToCss(accent))
    gradient.addColorStop(1, hexToCss(shadow))

    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    for (let index = 0; index < 28; index += 1) {
      const y = random() * height
      const bandHeight = randomRange(random, 12, 26)

      context.fillStyle = "#ffffff"
      context.globalAlpha = randomRange(random, 0.05, 0.14)
      context.fillRect(0, y, width, bandHeight)
    }

    for (let index = 0; index < 90; index += 1) {
      context.strokeStyle = index % 2 === 0 ? "#ffffff" : hexToCss(shadow)
      context.globalAlpha = randomRange(random, 0.04, 0.1)
      context.lineWidth = randomRange(random, 2, 5)
      context.beginPath()
      context.moveTo(random() * width, random() * height)
      context.bezierCurveTo(
        random() * width,
        random() * height,
        random() * width,
        random() * height,
        random() * width,
        random() * height,
      )
      context.stroke()
    }

    context.globalAlpha = 1
  })
}

function createMoonTexture({ seed, base, accent, crater }) {
  return createCanvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(hashString(seed))
    const gradient = context.createLinearGradient(0, 0, 0, height)

    gradient.addColorStop(0, hexToCss(base))
    gradient.addColorStop(0.6, hexToCss(accent))
    gradient.addColorStop(1, hexToCss(crater))

    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    addSpeckles(context, random, width, height, "#ffffff", 700, 0.4, 1.3, 0.05)
    addCraters(context, random, height, hexToCss(crater), "rgba(255,255,255,0.65)", 80, 4, 18)
  })
}

function createSunTexture(seed) {
  return createCanvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(hashString(seed))
    const gradient = context.createLinearGradient(0, 0, 0, height)

    gradient.addColorStop(0, "#fff4b8")
    gradient.addColorStop(0.45, "#ffcd6a")
    gradient.addColorStop(1, "#ff9f2d")

    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    for (let index = 0; index < 60; index += 1) {
      context.strokeStyle = index % 2 === 0 ? "#fff3c2" : "#ff9231"
      context.globalAlpha = randomRange(random, 0.08, 0.22)
      context.lineWidth = randomRange(random, 6, 18)
      context.beginPath()
      context.moveTo(0, random() * height)
      context.bezierCurveTo(
        width * 0.22,
        random() * height,
        width * 0.78,
        random() * height,
        width,
        random() * height,
      )
      context.stroke()
    }

    context.globalAlpha = 1
  })
}

function createRingTexture(seed, colors) {
  return createCanvasTexture(1024, 128, (context, width, height) => {
    const random = mulberry32(hashString(seed))
    context.clearRect(0, 0, width, height)

    for (let stripe = 0; stripe < 54; stripe += 1) {
      const y = (stripe / 54) * height
      const stripeHeight = randomRange(random, 1, 5)
      const color = colors[stripe % colors.length]

      context.fillStyle = hexToCss(color)
      context.globalAlpha = randomRange(random, 0.14, 0.48)
      context.fillRect(0, y, width, stripeHeight)
    }

    context.globalAlpha = 1
  })
}

function createBodyMaterial(config) {
  return new THREE.MeshStandardMaterial({
    color: config.color,
    map: config.textureFactory(),
    emissive: config.emissive ?? config.color,
    emissiveIntensity: config.emissiveIntensity ?? 0.08,
    roughness: config.roughness ?? 0.68,
    metalness: config.metalness ?? 0.04,
  })
}

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(2.7, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0xffcf76,
    map: createSunTexture("sun-core"),
    emissive: 0xff8c1a,
    emissiveIntensity: 2.1,
    roughness: 0.32,
    metalness: 0.04,
  }),
)
sun.userData.bodyId = "sun"
solarSystem.add(sun)

const sunCorona = new THREE.Mesh(
  new THREE.SphereGeometry(3.7, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0xffbf66,
    transparent: true,
    opacity: 0.11,
  }),
)
sunCorona.userData.bodyId = "sun"
solarSystem.add(sunCorona)

function createOrbit(radius, color, opacity = 0.38) {
  const points = []
  const segments = 240

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  })

  return new THREE.LineLoop(geometry, material)
}

const bodyLookup = new Map()
const interactiveObjects = []

const sunHit = createSelectionHitSphere(4.8, "sun")
solarSystem.add(sunHit)

const sunButton = createPlanetButton("sun", "Солнце")
planetPicker.append(sunButton)

const sunState = {
  id: "sun",
  kind: "star",
  label: "Солнце",
  subtitle: "Центральная звезда Солнечной системы",
  description: "Солнце удерживает всю систему своей гравитацией и даёт основной свет и тепло. В сцене это самый яркий объект с живой огненной текстурой и мягкой короной.",
  facts: [
    ["Тип", "Жёлтый карлик"],
    ["Роль", "Источник света и тепла"],
    ["Положение", "Центр системы"],
  ],
  size: 2.7,
  color: 0xffcf76,
  body: sun,
  halo: sunCorona,
  hitArea: sunHit,
  button: sunButton,
  focusMesh: sun,
}

registerBody(sunState)
interactiveObjects.push(sun, sunCorona, sunHit)

const systemConfigurations = [
  {
    id: "mercury",
    kind: "planet",
    label: "Меркурий",
    subtitle: "Ближайшая планета к Солнцу",
    description: "Каменистый мир с очень резкими перепадами температуры. Его поверхность напоминает древний, сильно кратерированный пейзаж.",
    facts: [
      ["Порядок", "1-я планета"],
      ["Тип", "Каменистая"],
      ["Год", "88 земных дней"],
    ],
    radius: 5.5,
    size: 0.34,
    color: 0xadafa7,
    speed: 1.6,
    offset: 0.2,
    textureFactory: () =>
      createRockyTexture({
        seed: "mercury",
        base: 0xb5b0a7,
        accent: 0x8e8a83,
        shadow: 0x5a5a57,
        crater: 0x464643,
      }),
    moons: [],
  },
  {
    id: "venus",
    kind: "planet",
    label: "Венера",
    subtitle: "Плотная и очень горячая атмосфера",
    description: "Облака Венеры скрывают поверхность и создают мощный парниковый эффект. В схеме это тёплая, почти янтарная планета.",
    facts: [
      ["Порядок", "2-я планета"],
      ["Тип", "Каменистая"],
      ["Особенность", "Густые облака"],
    ],
    radius: 7.8,
    size: 0.58,
    color: 0xd7b37f,
    speed: 1.22,
    offset: 1.7,
    textureFactory: () =>
      createGasTexture({
        seed: "venus",
        colors: [0xe6c18c, 0xc8995f, 0xe0b67d, 0xb77e47],
      }),
    roughness: 0.74,
    moons: [],
  },
  {
    id: "earth",
    kind: "planet",
    label: "Земля",
    subtitle: "Планета океанов, облаков и жизни",
    description: "Синяя палитра, светлые облачные поля и зелёные массивы суши делают Землю самой узнаваемой текстурой в этой сцене.",
    facts: [
      ["Порядок", "3-я планета"],
      ["Тип", "Каменистая"],
      ["Особенность", "Жидкая вода"],
    ],
    radius: 10.3,
    size: 0.62,
    color: 0x7ec7ff,
    speed: 1,
    offset: 3.1,
    textureFactory: () => createEarthTexture("earth"),
    moons: [
      {
        id: "moon",
        kind: "moon",
        label: "Луна",
        subtitle: "Естественный спутник Земли",
        description: "Серый каменный спутник с кратерами и тёмными морями. Именно он сильнее всего влияет на приливы и ночное небо Земли.",
        facts: [
          ["Тип", "Каменистый спутник"],
          ["Планета", "Земля"],
          ["Особенность", "Фазы Луны"],
        ],
        orbitRadius: 1.26,
        size: 0.16,
        speed: 4.6,
        offset: 0.8,
        color: 0xc9c8c3,
        textureFactory: () =>
          createMoonTexture({
            seed: "moon",
            base: 0xd8d6d0,
            accent: 0xa9a8a1,
            crater: 0x6e6d69,
          }),
      },
    ],
  },
  {
    id: "mars",
    kind: "planet",
    label: "Марс",
    subtitle: "Красная планета с пылевой поверхностью",
    description: "Тёплая ржаво-красная текстура подчеркивает железистую пыль, каньоны и сухой характер Марса.",
    facts: [
      ["Порядок", "4-я планета"],
      ["Тип", "Каменистая"],
      ["Особенность", "Следы древней воды"],
    ],
    radius: 13,
    size: 0.48,
    color: 0xc87456,
    speed: 0.82,
    offset: 2.4,
    textureFactory: () =>
      createRockyTexture({
        seed: "mars",
        base: 0xc86f4f,
        accent: 0xa54f38,
        shadow: 0x6f2d20,
        crater: 0x4c1d16,
      }),
    moons: [
      {
        id: "phobos",
        kind: "moon",
        label: "Фобос",
        subtitle: "Крупнейший спутник Марса",
        description: "Небольшой тёмный спутник неправильной формы. Он движется очень близко к Марсу и выглядит как быстрое внутреннее кольцо.",
        facts: [
          ["Тип", "Каменистый спутник"],
          ["Планета", "Марс"],
          ["Орбита", "Очень близкая"],
        ],
        orbitRadius: 0.96,
        size: 0.12,
        speed: 6.4,
        offset: 0.2,
        color: 0x8d7b70,
        textureFactory: () =>
          createMoonTexture({
            seed: "phobos",
            base: 0xa09188,
            accent: 0x85756c,
            crater: 0x5d4d46,
          }),
      },
      {
        id: "deimos",
        kind: "moon",
        label: "Деймос",
        subtitle: "Внешний спутник Марса",
        description: "Ещё более маленький и спокойный спутник Марса. Его орбита проходит дальше и читается как второе тонкое кольцо.",
        facts: [
          ["Тип", "Каменистый спутник"],
          ["Планета", "Марс"],
          ["Размер", "Очень малый"],
        ],
        orbitRadius: 1.4,
        size: 0.1,
        speed: 4.8,
        offset: 1.1,
        color: 0x9c8e7b,
        textureFactory: () =>
          createMoonTexture({
            seed: "deimos",
            base: 0xb5a58f,
            accent: 0x93826d,
            crater: 0x675847,
          }),
      },
    ],
  },
  {
    id: "jupiter",
    kind: "planet",
    label: "Юпитер",
    subtitle: "Полосатый газовый гигант",
    description: "Широкие облачные пояса и большое тёплое пятно делают текстуру Юпитера самой заметной среди внешних планет.",
    facts: [
      ["Порядок", "5-я планета"],
      ["Тип", "Газовый гигант"],
      ["Масштаб", "Самый большой"],
    ],
    radius: 17.6,
    size: 1.45,
    color: 0xd9c19b,
    speed: 0.45,
    offset: 0.8,
    textureFactory: () =>
      createGasTexture({
        seed: "jupiter",
        colors: [0xf0ddb9, 0xc8aa86, 0xe7cfac, 0xb88761, 0xe5c49b],
        spot: { color: 0xb25b44, x: 0.68, y: 0.58 },
      }),
    moons: [
      {
        id: "io",
        kind: "moon",
        label: "Ио",
        subtitle: "Вулканический спутник Юпитера",
        description: "Жёлто-оранжевый спутник с пятнистой поверхностью. Ио известен как один из самых геологически активных миров.",
        facts: [
          ["Тип", "Каменистый спутник"],
          ["Планета", "Юпитер"],
          ["Особенность", "Вулканы"],
        ],
        orbitRadius: 2.15,
        size: 0.18,
        speed: 5.2,
        offset: 0.5,
        color: 0xf0cf72,
        textureFactory: () =>
          createRockyTexture({
            seed: "io",
            base: 0xf0d37c,
            accent: 0xd38b34,
            shadow: 0x9b6127,
            crater: 0x674019,
          }),
      },
      {
        id: "europa",
        kind: "moon",
        label: "Европа",
        subtitle: "Ледяной спутник с трещинами",
        description: "Светлая ледяная кора с коричневыми линиями намекает на сложную сеть разломов и вероятный подповерхностный океан.",
        facts: [
          ["Тип", "Ледяной спутник"],
          ["Планета", "Юпитер"],
          ["Особенность", "Подлёдный океан"],
        ],
        orbitRadius: 2.8,
        size: 0.17,
        speed: 4.5,
        offset: 2,
        color: 0xdde7e0,
        textureFactory: () =>
          createIceTexture({
            seed: "europa",
            base: 0xf3f2e8,
            accent: 0xded8c6,
            shadow: 0xa08f74,
          }),
      },
      {
        id: "ganymede",
        kind: "moon",
        label: "Ганимед",
        subtitle: "Крупнейший спутник в системе",
        description: "Крупный спутник с тёмными и светлыми областями. В этой схеме он выглядит как холодный коричнево-серый мир рядом с Юпитером.",
        facts: [
          ["Тип", "Крупный спутник"],
          ["Планета", "Юпитер"],
          ["Рекорд", "Больше Меркурия"],
        ],
        orbitRadius: 3.55,
        size: 0.21,
        speed: 3.8,
        offset: 4.4,
        color: 0xb7a895,
        textureFactory: () =>
          createMoonTexture({
            seed: "ganymede",
            base: 0xc9b9a4,
            accent: 0x9c8c78,
            crater: 0x6d5f52,
          }),
      },
    ],
  },
  {
    id: "saturn",
    kind: "planet",
    label: "Сатурн",
    subtitle: "Газовый гигант с ледяными кольцами",
    description: "Нежные песочные полосы и кольца с полупрозрачной текстурой делают Сатурн самым графичным объектом в сцене.",
    facts: [
      ["Порядок", "6-я планета"],
      ["Тип", "Газовый гигант"],
      ["Особенность", "Широкие кольца"],
    ],
    radius: 22.8,
    size: 1.2,
    color: 0xe3d39b,
    speed: 0.34,
    offset: 2.1,
    textureFactory: () =>
      createGasTexture({
        seed: "saturn",
        colors: [0xf2e3b3, 0xceb07d, 0xe4cf9e, 0xb89a6f],
      }),
    ringColors: [0xf3e6bb, 0xd8bd87, 0xb8a06f, 0xf2e4c6],
    moons: [
      {
        id: "titan",
        kind: "moon",
        label: "Титан",
        subtitle: "Крупный спутник Сатурна",
        description: "Плотная атмосфера Титана придаёт ему мягкую золотистую текстуру. Это один из самых интересных спутников для исследований.",
        facts: [
          ["Тип", "Крупный спутник"],
          ["Планета", "Сатурн"],
          ["Особенность", "Плотная атмосфера"],
        ],
        orbitRadius: 2.6,
        size: 0.22,
        speed: 3.1,
        offset: 1.5,
        color: 0xd6b56f,
        textureFactory: () =>
          createGasTexture({
            seed: "titan",
            colors: [0xf2cc7c, 0xd6a654, 0xe7b869, 0xb17d3c],
          }),
      },
      {
        id: "enceladus",
        kind: "moon",
        label: "Энцелад",
        subtitle: "Яркий ледяной спутник",
        description: "Почти белый ледяной спутник с гладкой корой. Его поверхность отражает много света и выглядит особенно чистой.",
        facts: [
          ["Тип", "Ледяной спутник"],
          ["Планета", "Сатурн"],
          ["Особенность", "Ледяная кора"],
        ],
        orbitRadius: 1.85,
        size: 0.14,
        speed: 4.6,
        offset: 4.2,
        color: 0xeef7ff,
        textureFactory: () =>
          createIceTexture({
            seed: "enceladus",
            base: 0xf9fdff,
            accent: 0xdbeef5,
            shadow: 0xb0d0db,
          }),
      },
    ],
  },
  {
    id: "uranus",
    kind: "planet",
    label: "Уран",
    subtitle: "Ледяной гигант спокойного голубого тона",
    description: "Почти гладкая текстура с мягкими бирюзовыми полосами подчёркивает спокойный и холодный образ Урана.",
    facts: [
      ["Порядок", "7-я планета"],
      ["Тип", "Ледяной гигант"],
      ["Особенность", "Сильный наклон оси"],
    ],
    radius: 28.5,
    size: 0.94,
    color: 0x9ad8d5,
    speed: 0.22,
    offset: 4.4,
    textureFactory: () =>
      createIceTexture({
        seed: "uranus",
        base: 0xb8f1ee,
        accent: 0x8ad0cf,
        shadow: 0x5fa5b1,
      }),
    moons: [
      {
        id: "titania",
        kind: "moon",
        label: "Титания",
        subtitle: "Крупнейший спутник Урана",
        description: "Холодный серо-ледяной спутник с мягким рельефом. В сцене он подчёркивает бледную палитру системы Урана.",
        facts: [
          ["Тип", "Ледяной спутник"],
          ["Планета", "Уран"],
          ["Особенность", "Крупнейший у Урана"],
        ],
        orbitRadius: 1.9,
        size: 0.17,
        speed: 3.6,
        offset: 0.7,
        color: 0xc8d8dc,
        textureFactory: () =>
          createMoonTexture({
            seed: "titania",
            base: 0xe4e8ea,
            accent: 0xb8c2c5,
            crater: 0x7a888d,
          }),
      },
      {
        id: "miranda",
        kind: "moon",
        label: "Миранда",
        subtitle: "Малый спутник со сложным рельефом",
        description: "Небольшой и светлый спутник с контрастными пятнами, напоминающими фрагменты ледяных блоков.",
        facts: [
          ["Тип", "Ледяной спутник"],
          ["Планета", "Уран"],
          ["Размер", "Малый"],
        ],
        orbitRadius: 1.3,
        size: 0.11,
        speed: 5,
        offset: 3.3,
        color: 0xdce8ea,
        textureFactory: () =>
          createIceTexture({
            seed: "miranda",
            base: 0xf4fbfd,
            accent: 0xd3e2e5,
            shadow: 0x9ab0b5,
          }),
      },
    ],
  },
  {
    id: "neptune",
    kind: "planet",
    label: "Нептун",
    subtitle: "Тёмно-синий ледяной гигант",
    description: "Синий цвет, насыщенные тени и мягкие полосы делают Нептун самым глубоким по тону объектом во внешней части системы.",
    facts: [
      ["Порядок", "8-я планета"],
      ["Тип", "Ледяной гигант"],
      ["Особенность", "Сильные ветры"],
    ],
    radius: 34.2,
    size: 0.92,
    color: 0x658df4,
    speed: 0.17,
    offset: 5.3,
    textureFactory: () =>
      createIceTexture({
        seed: "neptune",
        base: 0x7ab2ff,
        accent: 0x4f76d2,
        shadow: 0x27428d,
      }),
    moons: [
      {
        id: "triton",
        kind: "moon",
        label: "Тритон",
        subtitle: "Крупный спутник Нептуна",
        description: "Холодный светлый спутник с ледяной корой. Он завершает цепочку внешних миров и добавляет последнюю точку фокуса на дальнем краю системы.",
        facts: [
          ["Тип", "Ледяной спутник"],
          ["Планета", "Нептун"],
          ["Особенность", "Очень холодный"],
        ],
        orbitRadius: 1.7,
        size: 0.16,
        speed: 3.4,
        offset: 5.8,
        color: 0xdfe8f2,
        textureFactory: () =>
          createIceTexture({
            seed: "triton",
            base: 0xf8fdff,
            accent: 0xd9e7ef,
            shadow: 0xa8bac5,
          }),
      },
    ],
  },
]

function registerBody(body) {
  bodyLookup.set(body.id, body)
}

function getBodyById(bodyId) {
  return bodyLookup.get(bodyId) ?? null
}

function createSelectionHitSphere(size, bodyId) {
  const hitSphere = new THREE.Mesh(
    new THREE.SphereGeometry(size, 18, 18),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )

  hitSphere.userData.bodyId = bodyId
  return hitSphere
}

function createMoonButton(moonId, label) {
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = label
  button.addEventListener("click", () => {
    selectBodyById(moonId)
  })
  return button
}

function createPlanetButton(planetId, label) {
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = label
  button.addEventListener("click", () => {
    selectBodyById(planetId)
  })
  return button
}

const planets = systemConfigurations.map((config) => {
  const orbit = createOrbit(config.radius, config.color)
  solarSystem.add(orbit)

  const orbitHit = new THREE.Mesh(
    new THREE.RingGeometry(config.radius - 0.42, config.radius + 0.42, 128),
    new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  orbitHit.rotation.x = -Math.PI / 2
  orbitHit.userData.bodyId = config.id
  solarSystem.add(orbitHit)

  const pivot = new THREE.Group()
  solarSystem.add(pivot)

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(config.size, 48, 48),
    createBodyMaterial(config),
  )
  body.position.x = config.radius
  body.userData.bodyId = config.id
  pivot.add(body)

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(config.size * 1.8, 28, 28),
    new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.08,
    }),
  )
  halo.position.x = config.radius
  halo.userData.bodyId = config.id
  pivot.add(halo)

  const planetHit = createSelectionHitSphere(config.size * 1.65, config.id)
  planetHit.position.x = config.radius
  pivot.add(planetHit)

  let ring = null

  if (config.ringColors) {
    ring = new THREE.Mesh(
      new THREE.RingGeometry(config.size * 1.45, config.size * 2.25, 96),
      new THREE.MeshStandardMaterial({
        color: 0xe5d39f,
        map: createRingTexture(`${config.id}-ring`, config.ringColors),
        transparent: true,
        opacity: 0.84,
        side: THREE.DoubleSide,
        roughness: 0.82,
        metalness: 0.02,
      }),
    )

    ring.position.x = config.radius
    ring.rotation.x = Math.PI / 2
    ring.rotation.z = 0.45
    ring.userData.bodyId = config.id
    pivot.add(ring)
  }

  const button = createPlanetButton(config.id, config.label)
  planetPicker.append(button)

  const planetState = {
    ...config,
    orbit,
    orbitHit,
    pivot,
    body,
    halo,
    hitArea: planetHit,
    ring,
    button,
    focusMesh: body,
    moons: [],
  }

  registerBody(planetState)
  interactiveObjects.push(orbitHit, body, halo, planetHit)

  if (ring) {
    interactiveObjects.push(ring)
  }

  planetState.moons = config.moons.map((moonConfig) => {
    const anchor = new THREE.Group()
    anchor.position.x = config.radius
    pivot.add(anchor)

    const moonOrbit = createOrbit(moonConfig.orbitRadius, moonConfig.color, 0.18)
    anchor.add(moonOrbit)

    const moonPivot = new THREE.Group()
    anchor.add(moonPivot)

    const moonBody = new THREE.Mesh(
      new THREE.SphereGeometry(moonConfig.size, 32, 32),
      createBodyMaterial({
        ...moonConfig,
        emissiveIntensity: 0.04,
        roughness: 0.78,
      }),
    )
    moonBody.position.x = moonConfig.orbitRadius
    moonBody.userData.bodyId = moonConfig.id
    moonPivot.add(moonBody)

    const moonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(moonConfig.size * 1.8, 20, 20),
      new THREE.MeshBasicMaterial({
        color: moonConfig.color,
        transparent: true,
        opacity: 0.06,
      }),
    )
    moonHalo.position.x = moonConfig.orbitRadius
    moonHalo.userData.bodyId = moonConfig.id
    moonPivot.add(moonHalo)

    const moonHit = createSelectionHitSphere(moonConfig.size * 2.8, moonConfig.id)
    moonHit.position.x = moonConfig.orbitRadius
    moonPivot.add(moonHit)

    const moonButton = createMoonButton(moonConfig.id, moonConfig.label)

    const moonState = {
      ...moonConfig,
      parentPlanetId: config.id,
      parentPlanetLabel: config.label,
      anchor,
      orbit: moonOrbit,
      pivot: moonPivot,
      body: moonBody,
      halo: moonHalo,
      hitArea: moonHit,
      button: moonButton,
      focusMesh: moonBody,
    }

    registerBody(moonState)
    interactiveObjects.push(moonBody, moonHalo, moonHit)
    return moonState
  })

  return planetState
})

const starGeometry = new THREE.BufferGeometry()
const starCount = 3200
const starPositions = new Float32Array(starCount * 3)

for (let index = 0; index < starCount; index += 1) {
  const stride = index * 3
  const radius = 55 + Math.random() * 125
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)

  starPositions[stride] = radius * Math.sin(phi) * Math.cos(theta)
  starPositions[stride + 1] = radius * Math.cos(phi) * 0.65
  starPositions[stride + 2] = radius * Math.sin(phi) * Math.sin(theta)
}

starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))

const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0xdceeff,
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.88,
  }),
)
scene.add(stars)

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const focusTarget = new THREE.Vector3()
const focusCameraPosition = new THREE.Vector3()
const tempVector = new THREE.Vector3()
const pointerDown = { x: 0, y: 0 }

let selectedBodyId = null
let lastElapsed = 0
let frozenElapsed = null
let focusTransitionActive = false

function getPlanetById(planetId) {
  return planets.find((planet) => planet.id === planetId) ?? null
}

function getPlanetForBody(body) {
  if (!body) {
    return null
  }

  if (body.kind === "planet") {
    return body
  }

  if (body.kind === "moon") {
    return getPlanetById(body.parentPlanetId)
  }

  return null
}

function renderFacts(facts) {
  planetFacts.innerHTML = facts
    .map(([label, value]) => `<li><span>${label}</span><strong>${value}</strong></li>`)
    .join("")
}

function renderMoonSection(body) {
  const sourcePlanet = getPlanetForBody(body)

  if (!sourcePlanet || sourcePlanet.moons.length === 0) {
    moonSection.hidden = true
    moonPicker.replaceChildren()
    return
  }

  moonSection.hidden = false
  moonSectionTitle.textContent = `Спутники ${sourcePlanet.label}`
  moonPicker.replaceChildren(...sourcePlanet.moons.map((moon) => moon.button))
}

function updatePanel(body) {
  if (!body) {
    planetName.textContent = "Выберите объект"
    planetSubtitle.textContent = "Кликни по Солнцу, орбите, планете или спутнику, чтобы перевести выбранный объект в центр сцены."
    planetDescription.textContent = "Текстуры всех тел в этой версии сгенерированы процедурно прямо в браузере, а у крупных планет добавлены заметные спутники."
    renderFacts([
      ["Режим", "Интерактивный обзор"],
      ["Клик", "Солнце, орбита, планета, спутник"],
      ["Текстуры", "Процедурные CanvasTexture"],
    ])
    renderMoonSection(null)
    return
  }

  if (body.kind === "star") {
    planetName.textContent = body.label
    planetSubtitle.textContent = body.subtitle
    planetDescription.textContent = body.description
    renderFacts(body.facts)
  } else if (body.kind === "planet") {
    planetName.textContent = body.label
    planetSubtitle.textContent = body.subtitle
    planetDescription.textContent = body.description
    renderFacts([
      ...body.facts,
      ["Спутники", body.moons.length > 0 ? String(body.moons.length) : "Нет"],
    ])
  } else {
    planetName.textContent = body.label
    planetSubtitle.textContent = body.subtitle
    planetDescription.textContent = body.description
    renderFacts(body.facts)
  }

  renderMoonSection(body)
}

function refreshSelectionStyles() {
  const selectedBody = getBodyById(selectedBodyId)
  const selectedPlanet = getPlanetForBody(selectedBody)
  const isSunSelected = selectedBody?.id === "sun"

  sunButton.classList.toggle("active", isSunSelected)
  sun.material.emissiveIntensity = isSunSelected ? 2.75 : 2.1
  sunCorona.material.opacity = isSunSelected ? 0.18 : 0.11

  planets.forEach((planet) => {
    const isPlanetFocused = selectedBody?.id === planet.id
    const isSystemFocused = selectedPlanet?.id === planet.id

    planet.orbit.material.opacity = isSystemFocused ? 0.95 : 0.38
    planet.orbit.material.color.setHex(isSystemFocused ? 0xffcc75 : planet.color)
    planet.halo.material.opacity = isPlanetFocused ? 0.18 : isSystemFocused ? 0.12 : 0.08
    planet.body.scale.setScalar(isPlanetFocused ? 1.18 : isSystemFocused ? 1.08 : 1)
    planet.button.classList.toggle("active", isSystemFocused)

    if (planet.ring) {
      planet.ring.material.opacity = isSystemFocused ? 0.96 : 0.84
    }

    planet.moons.forEach((moon) => {
      const isMoonFocused = selectedBody?.id === moon.id

      moon.orbit.material.opacity = isMoonFocused ? 0.72 : isSystemFocused ? 0.28 : 0.18
      moon.halo.material.opacity = isMoonFocused ? 0.18 : 0.06
      moon.body.scale.setScalar(isMoonFocused ? 1.25 : 1)
      moon.button.classList.toggle("active", isMoonFocused)
    })
  })
}

function focusOnBody(body) {
  selectedBodyId = body.id
  frozenElapsed = frozenElapsed ?? lastElapsed
  focusTransitionActive = true

  controls.minDistance = Math.max(body.size * 5.5, 3.4)
  controls.maxDistance = Math.max(body.size * 18, 26)

  body.focusMesh.getWorldPosition(tempVector)
  focusTarget.copy(tempVector)

  const currentOffset = camera.position.clone().sub(controls.target)

  if (currentOffset.lengthSq() === 0) {
    currentOffset.set(0, 12, 9)
  }

  currentOffset.normalize()

  const focusDistance = Math.max(body.size * 12, body.kind === "moon" ? 4.8 : 7.5)
  const verticalLift = Math.max(body.size * 3.2, body.kind === "moon" ? 0.9 : 1.5)

  focusCameraPosition.copy(focusTarget)
  focusCameraPosition.add(currentOffset.multiplyScalar(focusDistance))
  focusCameraPosition.y += verticalLift

  updatePanel(body)
  refreshSelectionStyles()
}

function selectBodyById(bodyId) {
  const body = getBodyById(bodyId)

  if (!body) {
    return
  }

  focusOnBody(body)
}

function resetOverview() {
  selectedBodyId = null
  frozenElapsed = null
  focusTransitionActive = true
  controls.minDistance = 22
  controls.maxDistance = 85
  updatePanel(null)
  refreshSelectionStyles()
}

function setPointer(event) {
  const rect = canvas.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

function getIntersectedBody(event) {
  setPointer(event)
  raycaster.setFromCamera(pointer, camera)

  const hit = raycaster.intersectObjects(interactiveObjects, false)[0]

  if (!hit) {
    return null
  }

  return getBodyById(hit.object.userData.bodyId)
}

function resizeScene() {
  const width = window.innerWidth
  const height = window.innerHeight

  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function renderFrame(time) {
  const elapsed = time * 0.001
  const simulationElapsed = frozenElapsed ?? elapsed

  sun.rotation.y = elapsed * 0.22
  sun.scale.setScalar(1 + Math.sin(elapsed * 1.2) * 0.018)
  sunCorona.scale.setScalar(1 + Math.sin(elapsed * 1.2 + 0.7) * 0.032)
  stars.rotation.y = elapsed * 0.01

  planets.forEach((planet, index) => {
    const orbitAngle = simulationElapsed * planet.speed * 0.35 + planet.offset
    planet.pivot.rotation.y = orbitAngle
    planet.body.rotation.y = simulationElapsed * (0.8 + index * 0.05)
    planet.halo.scale.setScalar(1 + Math.sin(simulationElapsed * 1.6 + index) * 0.02)

    planet.moons.forEach((moon, moonIndex) => {
      moon.pivot.rotation.y = simulationElapsed * moon.speed * 0.34 + moon.offset
      moon.body.rotation.y = simulationElapsed * (1.2 + moonIndex * 0.07)
      moon.halo.scale.setScalar(1 + Math.sin(simulationElapsed * 2 + moonIndex) * 0.03)
    })
  })

  if (selectedBodyId) {
    const selectedBody = getBodyById(selectedBodyId)

    if (selectedBody) {
      selectedBody.focusMesh.getWorldPosition(tempVector)
      focusTarget.copy(tempVector)

      if (focusTransitionActive) {
        controls.target.lerp(focusTarget, 0.16)
        camera.position.lerp(focusCameraPosition, 0.11)

        if (
          controls.target.distanceTo(focusTarget) < 0.05 &&
          camera.position.distanceTo(focusCameraPosition) < 0.08
        ) {
          controls.target.copy(focusTarget)
          focusTransitionActive = false
        }
      } else {
        controls.target.copy(focusTarget)
      }
    }
  } else if (focusTransitionActive) {
    controls.target.lerp(overviewTarget, 0.12)
    camera.position.lerp(overviewCameraPosition, 0.08)

    if (
      controls.target.distanceTo(overviewTarget) < 0.05 &&
      camera.position.distanceTo(overviewCameraPosition) < 0.1
    ) {
      controls.target.copy(overviewTarget)
      camera.position.copy(overviewCameraPosition)
      focusTransitionActive = false
    }
  }

  controls.update()
  renderer.render(scene, camera)
  lastElapsed = elapsed
  window.requestAnimationFrame(renderFrame)
}

window.addEventListener("resize", resizeScene)

canvas.addEventListener("pointermove", (event) => {
  const hoveredBody = getIntersectedBody(event)
  canvas.style.cursor = hoveredBody ? "pointer" : "grab"
})

canvas.addEventListener("pointerleave", () => {
  canvas.style.cursor = "grab"
})

canvas.addEventListener("pointerdown", (event) => {
  pointerDown.x = event.clientX
  pointerDown.y = event.clientY
})

canvas.addEventListener("pointerup", (event) => {
  const moveDistance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y)

  if (moveDistance > 6) {
    return
  }

  const body = getIntersectedBody(event)

  if (body) {
    focusOnBody(body)
  }
})

resetButton.addEventListener("click", () => {
  resetOverview()
})

resizeScene()
updatePanel(null)
refreshSelectionStyles()
canvas.style.cursor = "grab"
window.requestAnimationFrame(renderFrame)
