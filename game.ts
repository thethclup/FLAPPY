```typescript
import { Multisynq } from "@multisynq/client";

interface BirdState {
    x: number;
    y: number;
    velocity: number;
    score: number;
    viewId: string;
    alive: boolean;
}

interface PipeState {
    x: number;
    top: number;
    bottom: number;
    width: number;
    passed: boolean;
}

interface Star {
    x: number;
    y: number;
    size: number;
    speed: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
}

class BirdModel extends Multisynq.Model {
    static register(classId: string) {
        super.register(classId);
    }

    state: BirdState;

    init(options: { viewId: string, x?: number, y?: number }) {
        this.state = {
            x: options.x ?? 64,
            y: options.y ?? 300,
            velocity: 0,
            score: 0,
            viewId: options.viewId,
            alive: true
        };
        this.subscribe(this.id, "flap", this.handleFlap);
        this.subscribe(this.sessionId, "game-update", this.handleGameUpdate);
    }

    handleFlap() {
        if (this.state.alive) {
            this.state.velocity = -11; // Match original flap impulse
            this.publish(this.id, "bird-update", { y: this.state.y, velocity: this.state.velocity });
        }
    }

    handleGameUpdate(data: { pipes: PipeState[], deltaTime: number, height: number }) {
        if (!this.state.alive) return;

        // Update physics
        const gravity = 0.7;
        this.state.velocity += gravity * data.deltaTime;
        this.state.y += this.state.velocity;

        // Check bounds
        if (this.state.y > data.height - 16 || this.state.y < 16) {
            this.state.alive = false;
            this.publish(this.sessionId, "game-over", { viewId: this.state.viewId, score: this.state.score });
            return;
        }

        // Check collisions with pipes
        const birdSize = 32 * 0.8;
        for (const pipe of data.pipes) {
            if (this.state.x + birdSize / 2 > pipe.x && this.state.x - birdSize / 2 < pipe.x + pipe.width) {
                if (this.state.y - birdSize / 2 < pipe.top || this.state.y + birdSize / 2 > data.height - pipe.bottom) {
                    this.state.alive = false;
                    this.publish(this.sessionId, "game-over", { viewId: this.state.viewId, score: this.state.score });
                    this.publish(this.id, "collision", { x: this.state.x, y: this.state.y });
                    return;
                }
            }
            // Score when passing pipe
            if (!pipe.passed && this.state.x > pipe.x + pipe.width) {
                pipe.passed = true;
                this.state.score++;
                this.publish(this.sessionId, "score-update", { viewId: this.state.viewId, score: this.state.score });
            }
        }

        this.publish(this.id, "bird-update", { y: this.state.y, velocity: this.state.velocity });
    }

    destroy() {
        super.destroy();
    }
}

class GameModel extends Multisynq.Model {
    static register(classId: string) {
        super.register(classId);
    }

    state: { pipes: PipeState[] } = { pipes: [] };
    birds: Map<string, BirdModel> = new Map();
    height: number = 600; // Default height, updated by View

    init() {
        this.subscribe(this.sessionId, "view-join", this.handleViewJoin);
        this.subscribe(this.sessionId, "view-exit", this.handleViewExit);
        this.subscribe(this.sessionId, "resize", this.handleResize);
        this.future(16).update();
        this.future(2000).spawnPipe();
    }

    handleViewJoin(info: Multisynq.ViewInfo<any>) {
        const bird = BirdModel.create({ viewId: info.viewId });
        bird.beWellKnownAs(`bird_${info.viewId}`);
        this.birds.set(info.viewId, bird);
    }

    handleViewExit(info: Multisynq.ViewInfo<any>) {
        const bird = this.birds.get(info.viewId);
        if (bird) {
            bird.destroy();
            this.birds.delete(info.viewId);
        }
    }

    handleResize(data: { height: number }) {
        this.height = data.height;
    }

    spawnPipe() {
        const spacing = this.height / 4;
        const top = this.random() * (this.height / 2 - this.height / 3) + this.height / 3;
        const bottom = this.height - (top + spacing);
        this.state.pipes.push({ x: 400, top, bottom, width: 50, passed: false });
        this.publish(this.sessionId, "pipe-spawn", { x: 400, top, bottom, width: 50 });
        this.future(2000).spawnPipe();
    }

    update() {
        const deltaTime = 16 / 1000; // 16ms in seconds
        for (const pipe of this.state.pipes) {
            pipe.x -= 2.5; // Match original pipeSpeed
        }
        this.state.pipes = this.state.pipes.filter(pipe => pipe.x > -pipe.width);
        this.publish(this.sessionId, "game-update", { pipes: this.state.pipes, deltaTime, height: this.height });
        this.future(16).update();
    }

    destroy() {
        for (const bird of this.birds.values()) {
            bird.destroy();
        }
        super.destroy();
    }
}

class FlappyView extends Multisynq.View {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    birdStates: Map<string, BirdState> = new Map();
    pipes: PipeState[] = [];
    stars: Star[] = [];
    particles: Particle[] = [];
    width: number;
    height: number;
    dpr: number;
    lastUpdate: Map<string, { y: number, velocity: number }> = new Map();
    audioEnabled: boolean = false;
    lastFlapTime: number = 0;
    flapCooldown: number = 150;

    constructor(model: GameModel) {
        super(model);
        this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.dpr = window.devicePixelRatio || 1;
        this.resizeCanvas();
        window.addEventListener("resize", this.resizeCanvas.bind(this));

        // Initialize stars
        for (let i = 0; i < 30; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.3,
            });
        }

        // Subscribe to events
        this.subscribe(this.sessionId, "pipe-spawn", this.handlePipeSpawn.bind(this));
        this.subscribe(this.sessionId, "score-update", this.handleScoreUpdate.bind(this));
        this.subscribe(this.sessionId, "game-update", this.handleGameUpdate.bind(this));
        this.subscribe(this.sessionId, "game-over", this.handleGameOver.bind(this));
        for (const bird of model.birds.values()) {
            this.subscribe(bird.id, { event: "bird-update", handling: "oncePerFrame" }, this.handleBirdUpdate.bind(this));
            this.subscribe(bird.id, "collision", this.handleCollision.bind(this));
        }

        // Input handling
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (e.touches.length === 1) this.handleInput();
        });
        this.canvas.addEventListener("touchmove", (e) => e.preventDefault());
        this.canvas.addEventListener("touchend", (e) => e.preventDefault());
        document.addEventListener("keydown", (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                this.handleInput();
            }
        });
        document.getElementById("audio-toggle")!.addEventListener("click", () => {
            this.audioEnabled = !this.audioEnabled;
            document.getElementById("audio-toggle")!.textContent = `Audio: ${this.audioEnabled ? "On" : "Off"}`;
        });

        this.future(16).render();
    }

    resizeCanvas() {
        const aspectRatio = 9 / 16;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        if (this.width / this.height > aspectRatio) {
            this.width = this.height * aspectRatio;
        } else {
            this.height = this.width / aspectRatio;
        }
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.scale(this.dpr, this.dpr);
        this.publish(this.sessionId, "resize", { height: this.height });
    }

    handlePipeSpawn(data: PipeState) {
        this.pipes.push({ ...data, passed: false });
    }

    handleScoreUpdate(data: { viewId: string, score: number }) {
        const birdState = this.birdStates.get(data.viewId) || { x: 64, y: this.height / 2, velocity: 0, score: 0, viewId: data.viewId, alive: true };
        birdState.score = data.score;
        this.birdStates.set(data.viewId, birdState);
        document.getElementById("score")!.textContent = this.birdStates.get(this.viewId)?.score.toString() || "0";
    }

    handleGameUpdate(data: { pipes: PipeState[] }) {
        this.pipes = data.pipes;
    }

    handleBirdUpdate(data: { y: number, velocity: number, viewId: string }) {
        const birdState = this.birdStates.get(data.viewId) || { x: 64, y: this.height / 2, velocity: 0, score: 0, viewId: data.viewId, alive: true };
        this.lastUpdate.set(data.viewId, { y: birdState.y, velocity: birdState.velocity });
        birdState.y = data.y;
        birdState.velocity = data.velocity;
        this.birdStates.set(data.viewId, birdState);
    }

    handleCollision(data: { x: number, y: number }) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: data.x,
                y: data.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                size: Math.random() * 5 + 2,
                life: 30,
            });
        }
    }

    handleGameOver(data: { viewId: string, score: number }) {
        const birdState = this.birdStates.get(data.viewId);
        if (birdState) {
            birdState.alive = false;
            if (data.viewId === this.viewId) {
                alert(`Game Over! Your Score: ${data.score}`);
                this.detach();
                location.reload();
            }
        }
    }

    handleInput() {
        const currentTime = performance.now();
        const bird = this.model.wellKnownModel<BirdModel>(`bird_${this.viewId}`);
        if (bird && currentTime - this.lastFlapTime > this.flapCooldown) {
            this.publish(bird.id, "flap", {});
            this.lastFlapTime = currentTime;
        }
    }

    render() {
        const now = this.extrapolatedNow();

        // Background
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, "#0a1432");
        gradient.addColorStop(1, "#320064");
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        this.ctx.fillStyle = "#ffffff";
        this.stars.forEach((star) => {
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = this.width;
                star.y = Math.random() * this.height;
            }
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Pipes
        this.ctx.fillStyle = "#ffffff";
        for (const pipe of this.pipes) {
            this.ctx.beginPath();
            this.ctx.rect(pipe.x, 0, pipe.width, pipe.top);
            this.ctx.rect(pipe.x, this.height - pipe.bottom, pipe.width, pipe.bottom);
            this.ctx.fill();
            this.ctx.fillStyle = "#800080";
            const stripeHeight = 8;
            const stripeSpacing = 50;
            for (let y = stripeSpacing; y < pipe.top - stripeHeight; y += stripeSpacing) {
                this.ctx.fillRect(pipe.x, y, pipe.width, stripeHeight);
            }
            for (let y = this.height - pipe.bottom; y < this.height - stripeHeight; y += stripeSpacing) {
                this.ctx.fillRect(pipe.x, y, pipe.width, stripeHeight);
            }
        }

        // Birds
        for (const [viewId, bird] of this.birdStates) {
            if (!bird.alive) continue;
            const last = this.lastUpdate.get(viewId) || { y: bird.y, velocity: bird.velocity };
            const t = Math.min((now - this.lastUpdate.get(viewId)?.time || now) / 16, 1);
            const interpolatedY = last.y + (bird.y - last.y) * t;

            this.ctx.fillStyle = viewId === this.viewId ? "#800080" : "#4b0082";
            this.ctx.beginPath();
            this.ctx.arc(bird.x, interpolatedY, 16, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = "#ffffff";
            this.ctx.beginPath();
            this.ctx.arc(bird.x - 8, interpolatedY - 8, 4, 0, Math.PI * 2);
            this.ctx.arc(bird.x + 8, interpolatedY - 8, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(bird.x, interpolatedY + 4, 8, 0, Math.PI);
            this.ctx.stroke();
        }

        // Particles
        this.ctx.fillStyle = "#ffffff";
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Scores
        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "white";
        let yOffset = 50;
        for (const [viewId, bird] of this.birdStates) {
            const label = viewId === this.viewId ? "Your Score" : `Player ${viewId.slice(0, 4)}`;
            this.ctx.fillText(`${label}: ${bird.score}`, 10, yOffset);
            yOffset += 20;
        }

        this.future(16).render();
    }

    detach() {
        this.canvas.removeEventListener("touchstart", this.handleInput);
        document.removeEventListener("keydown", this.handleInput);
        document.getElementById("audio-toggle")!.removeEventListener("click", this.handleInput);
        super.detach();
    }
}

BirdModel.register("BirdModel");
GameModel.register("GameModel");

async function startGame() {
    const session = await Multisynq.Session.join({
        appId: "flappy-bird",
        model: GameModel,
        view: FlappyView,
        autoSession: Multisynq.App.autoSession,
        autoPassword: Multisynq.App.autoPassword,
    });
    console.log(`Joined session ${session.id}`);
}

startGame().catch(console.error);
```