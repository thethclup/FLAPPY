let bird;
let pipes = [];
let score = 0;
let gameOver = false;
let stars = [];
let isMuted = false; // Track mute state for future audio compatibility

function setup() {
  createCanvas(400, 600); // Mobile-friendly canvas size
  bird = new Bird();
  pipes.push(new Pipe());
  // Generate 200 stars for the galaxy background
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      brightness: random(100, 255)
    });
  }
  // Signal that the game is ready to play
  if (window.FarcadeSDK) {
    window.FarcadeSDK.singlePlayer.actions.ready();
  }
  // Handle play again requests
  if (window.FarcadeSDK) {
    window.FarcadeSDK.on('play_again', () => {
      resetGame();
    });
  }
  // Handle mute/unmute requests
  if (window.FarcadeSDK) {
    window.FarcadeSDK.on('toggle_mute', (data) => {
      isMuted = data.isMuted; // Update mute state (for future audio)
    });
  }
}

function draw() {
  // Draw starry galaxy background
  background(0); // Black space background
  for (let star of stars) {
    fill(255, 255, 255, star.brightness); // White stars with varying brightness
    noStroke();
    ellipse(star.x, star.y, star.size, star.size);
    // Twinkle effect: slightly vary brightness
    star.brightness = constrain(star.brightness + random(-10, 10), 100, 255);
  }
  
  if (!gameOver) {
    // Update and show bird
    bird.update();
    bird.show();
    
    // Update and show pipes
    if (frameCount % 120 === 0) { // Increased interval for more spacing
      pipes.push(new Pipe());
    }
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].show();
      pipes[i].update();
      
      // Check collision
      if (pipes[i].hits(bird)) {
        gameOver = true;
        if (window.FarcadeSDK) {
          window.FarcadeSDK.singlePlayer.actions.hapticFeedback(); // Haptic feedback on collision
          window.FarcadeSDK.singlePlayer.actions.gameOver({ score: score }); // Report game over
        }
      }
      
      // Increase score if bird passes pipe
      if (pipes[i].passes(bird)) {
        score++;
      }
      
      // Remove off-screen pipes
      if (pipes[i].offscreen()) {
        pipes.splice(i, 1);
      }
    }
    
    // Display score
    fill(255);
    textSize(32);
    textAlign(LEFT);
    text(score, 10, 50);
  } else {
    // Game over screen
    fill(255, 100);
    rect(0, 0, width, height);
    fill(255);
    textSize(32);
    textAlign(CENTER);
    text('Game Over\nScore: ' + score + '\nTap to Restart', width / 2, height / 2);
  }
}

// Handle spacebar, mouse click, or touch for flapping
function keyPressed() {
  if (key === ' ' && !gameOver) {
    bird.flap();
  }
}

function mousePressed() {
  if (!gameOver) {
    bird.flap();
  } else {
    resetGame();
  }
}

function touchStarted() {
  if (!gameOver) {
    bird.flap();
  } else {
    resetGame();
  }
  return false; // Prevent default touch behavior
}

function resetGame() {
  bird = new Bird();
  pipes = [];
  pipes.push(new Pipe());
  score = 0;
  gameOver = false;
  // Regenerate stars on reset
  stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      brightness: random(100, 255)
    });
  }
}

class Bird {
  constructor() {
    this.y = height / 2;
    this.x = 100;
    this.velocity = 0;
    this.gravity = 0.4; // Reduced gravity for slower fall
    this.lift = -10; // Reduced lift for slower flap
  }
  
  show() {
    // Draw purple bird with smiling face
    fill(128, 0, 128); // Purple color
    ellipse(this.x, this.y, 40, 40); // Body
    fill(255);
    ellipse(this.x - 10, this.y - 10, 8, 8); // Left eye
    ellipse(this.x + 10, this.y - 10, 8, 8); // Right eye
    fill(0);
    ellipse(this.x - 10, this.y - 10, 4, 4); // Left pupil
    ellipse(this.x + 10, this.y - 10, 4, 4); // Right pupil
    noFill();
    stroke(255);
    strokeWeight(2);
    arc(this.x, this.y + 5, 20, 10, 0, PI); // Smiling mouth
    noStroke();
  }
  
  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
    
    // Prevent bird from going off-screen
    if (this.y > height) {
      this.y = height;
      this.velocity = 0;
      gameOver = true;
      if (window.FarcadeSDK) {
        window.FarcadeSDK.singlePlayer.actions.hapticFeedback(); // Haptic feedback on hitting floor
        window.FarcadeSDK.singlePlayer.actions.gameOver({ score: score }); // Report game over
      }
    }
    if (this.y < 0) {
      this.y = 0;
      this.velocity = 0;
    }
  }
  
  flap() {
    this.velocity = this.lift;
    if (window.FarcadeSDK) {
      window.FarcadeSDK.singlePlayer.actions.hapticFeedback(); // Haptic feedback on flap
    }
  }
}

class Pipe {
  constructor() {
    // Randomly select gap style
    const gapStyles = [
      { spacing: 175, top: random(height / 4, height / 2) }, // Standard gap
      { spacing: 125, top: random(height / 4, height / 2 + 50) }, // Narrow gap
      { spacing: 225, top: random(height / 5, height / 2 - 50) } // Wide gap
    ];
    const style = random(gapStyles);
    this.spacing = style.spacing;
    this.top = style.top;
    this.bottom = this.top + this.spacing;
    this.x = width;
    this.w = 50;
    this.speed = 2; // Reduced speed to match slower bird
    this.passed = false;
  }
  
  show() {
    fill(0, 255, 0); // Green pipes
    rect(this.x, 0, this.w, this.top);
    rect(this.x, this.bottom, this.w, height - this.bottom);
  }
  
  update() {
    this.x -= this.speed;
  }
  
  offscreen() {
    return this.x < -this.w;
  }
  
  hits(bird) {
    if (bird.y < this.top || bird.y > this.bottom) {
      if (bird.x > this.x && bird.x < this.x + this.w) {
        return true;
      }
    }
    return false;
  }
  
  passes(bird) {
    if (!this.passed && bird.x > this.x + this.w) {
      this.passed = true;
      return true;
    }
    return false;
  }
}