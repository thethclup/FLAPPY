const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 360;
canvas.height = 640;

let frames = 0;
const DEGREE = Math.PI / 180;

// kuş objesi
const bird = {
  x: 50,
  y: 150,
  w: 34,
  h: 26,
  radius: 12,
  gravity: 0.25,
  jump: 4.6,
  speed: 0,
  draw() {
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  },
  flap() {
    this.speed = -this.jump;
  },
  update() {
    this.speed += this.gravity;
    this.y += this.speed;

    if (this.y + this.radius >= canvas.height) {
      gameOver();
    }
  }
};

// borular
const pipes = [];
const pipeWidth = 50;
const gap = 120;
let pipeTimer = 0;
let score = 0;

function drawPipe(pipe) {
  ctx.fillStyle = "#228B22";
  ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
  ctx.fillRect(pipe.x, pipe.bottom, pipeWidth, canvas.height - pipe.bottom);
}

function spawnPipe() {
  let top = Math.random() * (canvas.height / 2);
  pipes.push({
    x: canvas.width,
    top: top,
    bottom: top + gap
  });
}

// skor
function drawScore() {
  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.fillText("Skor: " + score, 20, 40);
}

// oyun döngüsü
function update() {
  frames++;

  bird.update();

  if (frames % 90 === 0) spawnPipe();

  for (let i = 0; i < pipes.length; i++) {
    const p = pipes[i];
    p.x -= 2;
    drawPipe(p);

    // çarpışma kontrolü
    if (
      bird.x + bird.radius > p.x &&
      bird.x - bird.radius < p.x + pipeWidth &&
      (bird.y - bird.radius < p.top || bird.y + bird.radius > p.bottom)
    ) {
      gameOver();
    }

    if (p.x + pipeWidth < bird.x && !p.passed) {
      score++;
      p.passed = true;
    }
  }

  drawScore();
  bird.draw();
  requestAnimationFrame(update);
}

function gameOver() {
  alert("Oyun Bitti! Skorun: " + score);
  document.location.reload();
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") bird.flap();
});
document.addEventListener("touchstart", () => {
  bird.flap();
});

update();
