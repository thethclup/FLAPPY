export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        this.bird = {
            x: 50,
            y: 300,
            width: 30,
            height: 30,
            velocity: 0,
            gravity: 0.5,
            jumpPower: -8
        };
        
        this.pipes = [];
        this.score = 0;
        this.gameRunning = false;
        this.pipeWidth = 60;
        this.pipeGap = 150;
        this.pipeSpacing = 200;
        
        this.lastPipeTime = 0;
        this.pipeInterval = 1500; // milliseconds
        
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    start() {
        this.gameRunning = true;
        this.score = 0;
        this.pipes = [];
        this.bird.y = 300;
        this.bird.velocity = 0;
        this.lastPipeTime = Date.now();
        this.gameLoop();
    }
    
    flap() {
        if (this.gameRunning) {
            this.bird.velocity = this.bird.jumpPower;
        }
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }
    
    update() {
        // Update bird
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;
        
        // Check ground/ceiling collision
        if (this.bird.y <= 0 || this.bird.y >= this.canvas.height - this.bird.height) {
            this.endGame();
            return;
        }
        
        // Spawn pipes
        const currentTime = Date.now();
        if (currentTime - this.lastPipeTime > this.pipeInterval) {
            this.spawnPipe();
            this.lastPipeTime = currentTime;
        }
        
        // Update pipes
        this.pipes.forEach(pipe => {
            pipe.x -= 2;
        });
        
        // Remove off-screen pipes
        this.pipes = this.pipes.filter(pipe => pipe.x + this.pipeWidth > 0);
        
        // Check collisions
        this.checkCollisions();
        
        // Update score
        this.pipes.forEach(pipe => {
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
            }
        });
    }
    
    spawnPipe() {
        const gapStart = Math.random() * (this.canvas.height - this.pipeGap - 100) + 50;
        
        // Top pipe
        this.pipes.push({
            x: this.canvas.width,
            y: 0,
            width: this.pipeWidth,
            height: gapStart,
            passed: false
        });
        
        // Bottom pipe
        this.pipes.push({
            x: this.canvas.width,
            y: gapStart + this.pipeGap,
            width: this.pipeWidth,
            height: this.canvas.height - (gapStart + this.pipeGap),
            passed: false
        });
    }
    
    checkCollisions() {
        this.pipes.forEach(pipe => {
            if (this.bird.x < pipe.x + pipe.width &&
                this.bird.x + this.bird.width > pipe.x &&
                this.bird.y < pipe.y + pipe.height &&
                this.bird.y + this.bird.height > pipe.y) {
                this.endGame();
            }
        });
    }
    
    endGame() {
        this.gameRunning = false;
        this.onGameOver(this.score);
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clouds
        this.drawClouds();
        
        // Draw bird
        this.drawBird();
        
        // Draw pipes
        this.pipes.forEach(pipe => {
            this.drawPipe(pipe);
        });
        
        // Draw score
        this.drawScore();
    }
    
    drawBird() {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.width, this.bird.height);
        
        // Bird beak
        this.ctx.fillStyle = '#FF8C00';
        this.ctx.fillRect(this.bird.x + this.bird.width, this.bird.y + 10, 8, 6);
        
        // Bird eye
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(this.bird.x + 18, this.bird.y + 8, 4, 4);
        
        // Wing
        this.ctx.fillStyle = '#FFA500';
        this.ctx.fillRect(this.bird.x + 5, this.bird.y + 15, 15, 8);
    }
    
    drawPipe(pipe) {
        // Pipe body
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
        
        // Pipe cap
        this.ctx.fillStyle = '#32CD32';
        if (pipe.y === 0) {
            // Top pipe cap
            this.ctx.fillRect(pipe.x - 5, pipe.y + pipe.height - 20, pipe.width + 10, 20);
        } else {
            // Bottom pipe cap
            this.ctx.fillRect(pipe.x - 5, pipe.y, pipe.width + 10, 20);
        }
        
        // Pipe highlights
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(pipe.x + 5, pipe.y, 5, pipe.height);
    }
    
    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Simple cloud shapes
        const cloudPositions = [
            { x: 100, y: 50 },
            { x: 250, y: 80 },
            { x: 320, y: 40 }
        ];
        
        cloudPositions.forEach(cloud => {
            this.ctx.beginPath();
            this.ctx.arc(cloud.x, cloud.y, 20, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + 20, cloud.y, 25, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + 40, cloud.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawScore() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, 40);
        
        // Add text shadow
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2 + 1, 41);
    }
}