const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 600;

let ball = { x: Math.random() * 360, y: 0, radius: 20, speed: 2 };
let score = 0;

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (Math.hypot(ball.x - mx, ball.y - my) < ball.radius) {
    score++;
    resetBall();
  }
});

function resetBall() {
  ball = { x: Math.random() * 360, y: 0, radius: 20, speed: ball.speed + 0.2 };
}

function update() {
  ball.y += ball.speed;
  if (ball.y > canvas.height) {
    alert(`Oyun Bitti! Skorun: ${score}`);
    location.reload();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'red';
  ctx.fill();
  ctx.closePath();
  ctx.font = '20px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(`Skor: ${score}`, 10, 30);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
