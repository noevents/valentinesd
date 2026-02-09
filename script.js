const TEXTS = {
  q: "Моя луна и звёзды, \n примешь ли ты мою валентинку?",
  a: "Вау, хороший выбор!❤️",
};
const ASSETS = {
  audio: "assets/audio.mp3",
  central: "assets/central.jpeg",
  prefix: "assets/",
};

// DOM Elements
const loader = document.getElementById("loader");
const h1 = document.getElementById("heading");
const yesBtn = document.getElementById("yes-btn");
const noBtn = document.getElementById("no-btn");
const layer = document.getElementById("img-layer");
const centralContainer = document.getElementById("central-img-container");
const buttonsContainer = document.querySelector(".buttons");

// State
let audio;
let isPlaying = false;
const loadedImages = {};
let positionIndex = 0;
let nextBeatIndex = 0;

// BPM Configuration
const BPM = 106;
const BEAT_DURATION = 0.566; // seconds
const IMAGES_TO_REVEAL = 8; // Total images to reveal
let bpmBeats = [];
let revealBeats = []; // Which beats trigger image reveals

// Relative positions (as percentages of viewport) - arranged around screen
const RELATIVE_POSITIONS = [
  { xPercent: 10, yPercent: 15, r: -12 }, // top left
  { xPercent: 80, yPercent: 15, r: 8 }, // top right
  { xPercent: 20, yPercent: 45, r: 5 }, // middle left
  { xPercent: 93, yPercent: 45, r: -7 }, // middle right
  { xPercent: 15, yPercent: 75, r: 10 }, // bottom left
  { xPercent: 88, yPercent: 75, r: -15 }, // bottom right
  { xPercent: 50, yPercent: 10, r: 6 }, // top center
  { xPercent: 50, yPercent: 80, r: -9 }, // bottom center
];

// Calculate actual pixel positions from percentages
const getFixedPositions = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  return RELATIVE_POSITIONS.map((pos) => ({
    x: (pos.xPercent / 100) * vw,
    y: (pos.yPercent / 100) * vh,
    r: pos.r,
  }));
};

let FIXED_POSITIONS = getFixedPositions();

// --- Pre-rendering for Cursor Performance ---
const heartCache = document.createElement("canvas");
heartCache.width = 30;
heartCache.height = 30;
const hCtx = heartCache.getContext("2d");
hCtx.font = "24px serif";
hCtx.textBaseline = "middle";
hCtx.textAlign = "center";
hCtx.fillText("❤️", 15, 15);

// --- Initialization ---
h1.innerText = TEXTS.q;

const init = async () => {
  try {
    // Audio Preload
    audio = new Audio(ASSETS.audio);
    await new Promise((r) =>
      audio.addEventListener("canplaythrough", r, { once: true }),
    );

    // Generate BPM beats for entire song duration
    const audioDuration = audio.duration || 30;
    for (let time = 0; time < audioDuration; time += BEAT_DURATION) {
      bpmBeats.push(parseFloat(time.toFixed(2)));
    }

    // Set which beats reveal images (spread evenly across first 20 beats)
    const revealInterval = Math.floor(20 / IMAGES_TO_REVEAL);
    for (let i = 0; i < IMAGES_TO_REVEAL; i++) {
      revealBeats.push(i * revealInterval);
    }

    // Image Preload
    const imageFiles = Array.from(
      { length: IMAGES_TO_REVEAL },
      (_, i) => `${i + 1}.jpeg`,
    );
    await Promise.all(
      [...imageFiles, "central.jpeg"].map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.src =
              src === "central.jpeg" ? ASSETS.central : ASSETS.prefix + src;
            img.onload = () => {
              loadedImages[src] = img;
              resolve();
            };
            img.onerror = resolve;
          }),
      ),
    );

    loader.style.opacity = 0;
    setTimeout(() => loader.remove(), 500);
    setupInteractions();
  } catch (e) {
    console.error(e);
    loader.innerText = "Error loading <3";
  }
};

// --- Interactions ---
let noButtonMoved = false;
const setupInteractions = () => {
  noBtn.addEventListener("mouseover", moveNoButton);
  noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  yesBtn.addEventListener("click", startSequence);
};

const moveNoButton = () => {
  // On first hover, convert to fixed positioning
  if (!noButtonMoved) {
    const rect = noBtn.getBoundingClientRect();

    // Create invisible placeholder to prevent layout shift
    const placeholder = document.createElement("div");
    placeholder.style.width = rect.width + "px";
    placeholder.style.height = rect.height + "px";
    placeholder.style.visibility = "hidden";
    placeholder.style.pointerEvents = "none";

    // Insert placeholder before converting to fixed
    noBtn.parentNode.insertBefore(placeholder, noBtn);

    noBtn.style.position = "fixed";
    noBtn.style.left = rect.left + "px";
    noBtn.style.top = rect.top + "px";
    noBtn.style.margin = "0"; // Remove any margin that might affect positioning
    noButtonMoved = true;
  }

  // Constrain movement to 70% of screen dimensions
  const maxWidth = window.innerWidth * 0.7;
  const maxHeight = window.innerHeight * 0.7;
  const margin = window.innerWidth * 0.15;

  const maxX = maxWidth - noBtn.offsetWidth;
  const maxY = maxHeight - noBtn.offsetHeight;

  // Generate position far from cursor (min 150px away)
  let x,
    y,
    attempts = 0;
  do {
    x = margin + Math.random() * maxX;
    y = margin + Math.random() * maxY;
    attempts++;
  } while (Math.hypot(x - mouse.x, y - mouse.y) < 150 && attempts < 10);

  noBtn.style.left = "0";
  noBtn.style.top = "0";
  noBtn.style.transform = `translate3d(${x}px, ${y}px, 0)`;
};

const startSequence = () => {
  if (isPlaying) return;
  isPlaying = true;
  nextBeatIndex = 0;

  buttonsContainer.style.display = "none";
  h1.innerText = TEXTS.a;

  // Central Image
  const cImg = loadedImages["central.jpeg"]
    ? loadedImages["central.jpeg"].cloneNode()
    : new Image();
  if (!loadedImages["central.jpeg"]) cImg.src = ASSETS.central;
  cImg.classList.add("central-beat-pulse");
  centralContainer.appendChild(cImg);

  audio.currentTime = 0;
  audio.play();

  requestAnimationFrame(animationLoop);
};

// Removed old beat mode, BPM mode, and recording functions

// --- Main Animation Loop ---
const animationLoop = () => {
  if (!isPlaying) return;

  const ct = audio.currentTime;
  const latency = 0.02; // 20ms offset for tight sync

  // Process all beats that should have happened by now
  while (nextBeatIndex < bpmBeats.length) {
    const beatTime = bpmBeats[nextBeatIndex];
    if (ct >= beatTime - latency) {
      onBeat(nextBeatIndex);
      nextBeatIndex++;
    } else {
      break;
    }
  }

  requestAnimationFrame(animationLoop);
};

// Triggered on every beat
const onBeat = (beatIndex) => {
  // Pulse all visible images and central image
  pulseAllImages();

  // Check if this beat should reveal an image
  if (revealBeats.includes(beatIndex)) {
    const imageIndex = revealBeats.indexOf(beatIndex);
    revealImage(`${imageIndex + 1}.jpeg`);
  }
};

// --- Visual Logic ---
const revealImage = (src) => {
  const div = document.createElement("div");
  div.className = "mem-img";

  // Use fixed position from array
  const pos = FIXED_POSITIONS[positionIndex % FIXED_POSITIONS.length];
  positionIndex++;

  const { x, y, r } = pos;

  // Random entry rotation for varied reveal animation
  const entryRotation = (Math.random() - 0.5) * 360;

  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.setProperty("--rotation", `${r}deg`);
  div.style.setProperty("--entry-rotation", `${entryRotation}deg`);
  div.style.transform = `translate(-50%, -50%) rotate(${r}deg)`;

  const img = loadedImages[src] ? loadedImages[src].cloneNode() : new Image();
  if (!loadedImages[src]) img.src = ASSETS.prefix + src;

  div.appendChild(img);
  layer.appendChild(div);

  // Start reveal animation, then lock in revealed state
  requestAnimationFrame(() => {
    div.classList.add("revealing");
  });

  div.addEventListener(
    "animationend",
    () => {
      div.classList.remove("revealing");
      div.classList.add("revealed");
    },
    { once: true },
  );
};

// Pulse all visible images on beat
const pulseAllImages = () => {
  // Pulse memory images
  const images = document.querySelectorAll(".mem-img");
  images.forEach((div) => {
    div.classList.remove("beat-pulse");
    void div.offsetWidth; // Trigger reflow
    div.classList.add("beat-pulse");
  });

  // Pulse central image
  const centralImg = centralContainer.querySelector("img");
  if (centralImg) {
    centralImg.classList.remove("beat-pulse");
    void centralImg.offsetWidth; // Trigger reflow
    centralImg.classList.add("beat-pulse");
  }
};

// --- Highly Optimized Cursor ---
const cvs = document.getElementById("cursor");
const ctx = cvs.getContext("2d", { alpha: true }); // optimize context
let width, height;
let mouse = { x: -100, y: -100, lastX: -100, lastY: -100 };
let particles = [];

const resize = () => {
  width = cvs.width = window.innerWidth;
  height = cvs.height = window.innerHeight;
};
window.addEventListener("resize", resize);
// Passive event listener for scroll performance
window.addEventListener(
  "mousemove",
  (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  },
  { passive: true },
);

resize();

// Update fixed positions on window resize
window.addEventListener("resize", () => {
  FIXED_POSITIONS = getFixedPositions();
});

class Heart {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 0.8 + 0.5; // Scale multiplier for cached image
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * -2 - 0.5;
    this.life = 1;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= 0.02;
  }
  draw() {
    ctx.globalAlpha = this.life;
    // Draw from cache instead of fillText
    const s = this.size * 20;
    ctx.drawImage(heartCache, this.x - s / 2, this.y - s / 2, s, s);
  }
}

const animateCursor = () => {
  ctx.clearRect(0, 0, width, height);

  // Throttling: Only add particles if mouse moved enough distance
  const dist = Math.hypot(mouse.x - mouse.lastX, mouse.y - mouse.lastY);
  if (dist > 5) {
    particles.push(new Heart(mouse.x, mouse.y));
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
  }

  // Optimization: Iterate backwards to allow splicing
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    if (p.life <= 0) {
      particles.splice(i, 1);
    } else {
      p.draw();
    }
  }

  // Cap particles to prevent memory crash on low-end devices
  if (particles.length > 100) particles.splice(0, particles.length - 100);

  requestAnimationFrame(animateCursor);
};

animateCursor();
init();
