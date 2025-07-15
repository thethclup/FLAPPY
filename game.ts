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
    gapY: number; // Center of the gap
    gapHeight: number;
    scored: boolean;
}

interface GameState {
    pipes: PipeState[];
}

class BirdModel extends Multisynq.Model {
    static register(classId: string) {
        super.register(classId);
    }

    state: BirdState;

    init(options: { viewId: string, x?: number, y?: number }) {
        this.state = {
            x: options.x ?? 100,
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
            this.state.velocity = 6; // Upward impulse
            this.publish(this.id, "bird-update", { y: this.state.y, velocity: this.state.velocity });
        }
    }

    handleGameUpdate(data: { pipes: PipeState[], deltaTime: number }) {
        if (!this.state.alive) return;

        // Update physics
        const gravity = -9.8; // Gravity constant
        this.state.velocity += gravity * data.deltaTime;
        this.state.y -= this.state.velocity * data.deltaTime * 60; // Adjust for frame rate

        // Check bounds
        if (this.state.y < 0 || this.state.y > 600) {
            this.state.alive = false;
            this.publish(this.sessionId, "game-over", { viewId: this.state.viewId, score: this.state.score });
            return;
        }

        // Check collisions with pipes
        for (const pipe of data.pipes) {
            if (this.state.x + 20 > pipe.x && this.state.x - 20 < pipe.x + 50) { // Bird width ~40, pipe width 50
                const gapTop = pipe.gapY + pipe_gapHeight / 2;
                const gapBottom = pipe.gapY - pipe.gapHeight / 2;
                if (this.state.y + 20 > gapTop || this.state.y - 20 < gapBottom) {
                    this.state.alive = false;
                    this.publish(this.sessionId, "game-over", { viewId: this.state.viewId, score: this.state.score });
                    return;
                }
            }
            // Score when passing pipe
            if (!pipe.scored && this.state.x > pipe.x + 50) {
                pipe.scored = true;
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

    state: GameState = { pipes: [] };
    birds: Map<string, BirdModel> = new Map();

    init() {
        this.subscribe(this.sessionId, "view-join", this.handleViewJoin);
        this.subscribe(this.sessionId, "view-exit", this.handleViewExit);
        this.future(16).update(); // ~60 FPS
        this.future(2000).spawnPipe(); // Spawn pipe every 2 seconds
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

    spawnPipe() {
        const gapHeight = 150;
        const gapY = 200 + this.random() * 200; // Random gap center between 200 and 400
        this.state.pipes.push({ x: 400, gapY, gapHeight, scored: false });
        this.publish(this.sessionId, "pipe-spawn", { x: 400, gapY, gapHeight });
        this.future(2000).spawnPipe();
    }

    update() {
        const deltaTime = 16 / 1000; // 16ms in seconds
        for (const pipe of this.state.pipes) {
            pipe.x -= 2 * 60 * deltaTime; // Move pipes left at 2 pixels per frame
        }
        this.state.pipes = this.state.pipes.filter(pipe => pipe.x > -50); // Remove off-screen pipes
        this.publish(this.sessionId, "game-update", { pipes: this.state.pipes, deltaTime });
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
    lastUpdate: Map<string, { y: number, velocity: number }> = new Map();

    constructor(model: GameModel) {
        super(model);
        this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.subscribe(this.sessionId, "pipe-spawn", this.handlePipeSpawn.bind(this));
        this.subscribe(this.sessionId, "score-update", this.handleScoreUpdate.bind(this));
        this.subscribe(this.sessionId, "game-over", this.handleGameOver.bind(this));
        this.subscribe(this.sessionId, "game-update", this.handleGameUpdate.bind(this));
        for (const bird of model.birds.values()) {
            this.subscribe(bird.id, { event: "bird-update", handling: "oncePerFrame" }, this.handleBirdUpdate.bind(this));
        }
        this.canvas.addEventListener("click", this.handleInput.bind(this));
        document.addEventListener("keydown", (e) => {
            if (e.code === "Space") this.handleInput();
        });
        this.future(16).render();
    }

    handlePipeSpawn(data: PipeState) {
        this.pipes.push({ ...data, scored: false });
    }

    handleScoreUpdate(data: { viewId: string, score: number }) {
        const birdState = this.birdStates.get(data.viewId) || { x: 100, y: 300, velocity: 0, score: 0, viewId: data.viewId, alive: true };
        birdState.score = data.score;
        this.birdStates.set(data.viewId, birdState);
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

    handleBirdUpdate(data: { y: number, velocity: number, viewId: string }) {
        const birdState = this.birdStates.get(data.viewId) || { x: 100, y: 300, velocity: 0, score: 0, viewId: data.viewId, alive: true };
        this.lastUpdate.set(data.viewId, { y: birdState.y, velocity: birdState.velocity });
        birdState.y = data.y;
        birdState.velocity = data.velocity;
        this.birdStates.set(data.viewId, birdState);
    }

    handleGameUpdate(data: { pipes: PipeState[] }) {
        this.pipes = data.pipes;
    }

    handleInput() {
        const bird = this.model.wellKnownModel<BirdModel>(`bird_${this.viewId}`);
        if (bird) {
            this.publish(bird.id, "flap", {});
        }
    }

    render() {
        const now = this.extrapolatedNow();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render pipes
        this.ctx.fillStyle = "green";
        for (const pipe of this.pipes) {
            const gapTop = pipe.gapY + pipe.gapHeight / 2;
            const gapBottom = pipe.gapY - pipe.gapHeight / 2;
            this.ctx.fillRect(pipe.x, 0, 50, gapBottom);
            this.ctx.fillRect(pipe.x, gapTop, 50, 600 - gapTop);
        }

        // Render birds
        for (const [viewId, bird] of this.birdStates) {
            if (!bird.alive) continue;
            this.ctx.beginPath();
            this.ctx.arc(bird.x, bird.y, 20, 0, Math.PI * 2);
            this.ctx.fillStyle = viewId === this.viewId ? "yellow" : "blue";
            this.ctx.fill();
            this.ctx.closePath();
        }

        // Render scores
        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "white";
        let yOffset = 30;
        for (const [viewId, bird] of this.birdStates) {
            const label = viewId === this.viewId ? "Your Score" : `Player ${viewId.slice(0, 4)}`;
            this.ctx.fillText(`${label}: ${bird.score}`, 10, yOffset);
            yOffset += 20;
        }

        this.future(16).render();
    }

    detach() {
        this.canvas.removeEventListener("click", this.handleInput);
        document.removeEventListener("keydown", this.handleInput);
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