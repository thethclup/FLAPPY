import { Multisynq } from "@multisynq/client";

interface BallState {
    x: number;
    y: number;
    radius: number;
    speed: number;
}

interface PlayerState {
    score: number;
    viewId: string;
}

class BallModel extends Multisynq.Model {
    static register(classId: string) {
        super.register(classId);
    }

    state: BallState = { x: 0, y: 0, radius: 20, speed: 2 };

    init(options: { x?: number, y?: number, radius?: number, speed?: number } = {}) {
        this.state = {
            x: options.x ?? this.random() * 360,
            y: options.y ?? 0,
            radius: options.radius ?? 20,
            speed: options.speed ?? 2
        };
        this.subscribe(this.sessionId, "view-join", this.handleViewJoin);
        this.subscribe(this.sessionId, "view-exit", this.handleViewExit);
        this.subscribe(this.id, "click", this.handleClick);
        this.future(16).update(); // ~60 FPS
    }

    handleViewJoin(info: Multisynq.ViewInfo<any>) {
        const player = PlayerModel.create({ viewId: info.viewId, score: 0 });
        player.beWellKnownAs(`player_${info.viewId}`);
    }

    handleViewExit(info: Multisynq.ViewInfo<any>) {
        const player = this.wellKnownModel<PlayerModel>(`player_${info.viewId}`);
        if (player) {
            player.destroy();
        }
    }

    handleClick(data: { x: number, y: number, viewId: string }) {
        const { x, y } = data;
        if (Math.hypot(this.state.x - x, this.state.y - y) < this.state.radius) {
            const player = this.wellKnownModel<PlayerModel>(`player_${data.viewId}`);
            if (player) {
                player.state.score++;
                this.resetBall();
                this.publish(this.sessionId, "score-update", { viewId: data.viewId, score: player.state.score });
            }
        }
    }

    resetBall() {
        this.state = {
            x: this.random() * 360,
            y: 0,
            radius: 20,
            speed: this.state.speed + 0.2
        };
        this.publish(this.id, "ball-reset", this.state);
    }

    update() {
        this.state.y += this.state.speed * (16 / 1000); // Adjust for 16ms frame
        if (this.state.y > 600) {
            this.publish(this.sessionId, "game-over", { time: this.now() });
            this.state.y = 600; // Stop at bottom
        } else {
            this.publish(this.id, "ball-update", { x: this.state.x, y: this.state.y });
            this.future(16).update();
        }
    }

    destroy() {
        super.destroy();
    }
}

class PlayerModel extends Multisynq.Model {
    static register(classId: string) {
        super.register(classId);
    }

    state: PlayerState;

    init(options: { viewId: string, score?: number }) {
        this.state = {
            viewId: options.viewId,
            score: options.score ?? 0
        };
    }

    destroy() {
        super.destroy();
    }
}

class GameModel extends Multisynq.Model {
    static register(classId: string) {
        super.register(classId);
    }

    ball: BallModel;

    init() {
        this.ball = BallModel.create();
        this.ball.beWellKnownAs("ball");
    }

    destroy() {
        this.ball.destroy();
        super.destroy();
    }
}

class BallView extends Multisynq.View {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    ballState: BallState = { x: 0, y: 0, radius: 20, speed: 2 };
    scores: Map<string, number> = new Map();
    lastUpdate: number = 0;
    lastPosition: { x: number, y: number } = { x: 0, y: 0 };

    constructor(model: GameModel) {
        super(model);
        this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.subscribe(model.ball.id, { event: "ball-update", handling: "oncePerFrame" }, this.handleBallUpdate.bind(this));
        this.subscribe(model.ball.id, { event: "ball-reset", handling: "oncePerFrame" }, this.handleBallReset.bind(this));
        this.subscribe(model.sessionId, "score-update", this.handleScoreUpdate.bind(this));
        this.subscribe(model.sessionId, "game-over", this.handleGameOver.bind(this));
        this.canvas.addEventListener("click", this.handleCanvasClick.bind(this));
        this.future(16).render();
    }

    handleBallUpdate(data: { x: number, y: number }) {
        this.lastPosition = { x: this.ballState.x, y: this.ballState.y };
        this.ballState.x = data.x;
        this.ballState.y = data.y;
        this.lastUpdate = this.now();
    }

    handleBallReset(state: BallState) {
        this.ballState = { ...state };
        this.lastUpdate = this.now();
    }

    handleScoreUpdate(data: { viewId: string, score: number }) {
        this.scores.set(data.viewId, data.score);
    }

    handleGameOver(data: { time: number }) {
        const myScore = this.scores.get(this.viewId) ?? 0;
        alert(`Game Over! Your Score: ${myScore}`);
        this.detach();
        location.reload();
    }

    handleCanvasClick(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.publish(this.model.wellKnownModel("ball")!.id, "click", { x, y, viewId: this.viewId });
    }

    render() {
        const now = this.extrapolatedNow();
        const t = (now - this.lastUpdate) / 16;
        const interpolatedY = this.lastPosition.y + (this.ballState.y - this.lastPosition.y) * t;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        this.ctx.arc(this.ballState.x, interpolatedY, this.ballState.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = "red";
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "white";
        const myScore = this.scores.get(this.viewId) ?? 0;
        this.ctx.fillText(`Your Score: ${myScore}`, 10, 30);
        let yOffset = 50;
        for (const [viewId, score] of this.scores) {
            if (viewId !== this.viewId) {
                this.ctx.fillText(`Player ${viewId.slice(0, 4)}: ${score}`, 10, yOffset);
                yOffset += 20;
            }
        }

        this.future(16).render();
    }

    detach() {
        this.canvas.removeEventListener("click", this.handleCanvasClick);
        super.detach();
    }
}

BallModel.register("BallModel");
PlayerModel.register("PlayerModel");
GameModel.register("GameModel");

async function startGame() {
    const session = await Multisynq.Session.join({
        appId: "ball-game",
        model: GameModel,
        view: BallView,
        autoSession: Multisynq.App.autoSession,
        autoPassword: Multisynq.App.autoPassword,
    });
    console.log(`Joined session ${session.id}`);
}

startGame().catch(console.error);