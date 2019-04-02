import './tanks.less';
import { Tile, GrassTile } from './tile';
import { Bullet } from './bullet';
import { Player } from './player';
import AudioController from './audio';
import { Level } from './levels';
// import { Eagle } from './eagle';
import { Bot } from './bot';

import { WINDOW_SIZE, TILE_SIZE, BULLET_SPEED } from './global';
import { Bonus } from './bonus';

const isMobile = ("ontouchstart" in document.documentElement);

interface ILevel {
    // id: number;
    scores: number;
    maxScores: number;
    startWithBots: number;
}
interface IState {
    activeLevel: number;
    levels: ILevel[]
}

class State {
    public activeLevel = 0;
    public levels = [{
        scores: 0,
        maxScores: 10,
        startWithBots: 2
    }, {
        scores: 0,
        maxScores: 12,
        startWithBots: 3
    }, {
        scores: 0,
        maxScores: 15,
        startWithBots: 3
    }];
}

export class Game {
    public canvas: HTMLCanvasElement;
    private context;
    private sidebar: HTMLCanvasElement = document.createElement('canvas');
    private sidebarContext;
    private sidebarImages = [];
    private level: Level;
    public player: Player;

    public enemies: Bot[] = [];
    public bullets: Bullet[] = [];
    public tiles: Tile[] = [];
    public bonuses: Bonus[] = [];

    public markForNextLevel: boolean = false;
    public markForGameOver: boolean = false;

    public state: IState = new State();
    private paused: boolean = false;

    private gameCallback;
    private gameTimeouts: number[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        canvas.width = WINDOW_SIZE;
        canvas.height = WINDOW_SIZE;

        // AudioController.play('tanks/sounds/gameover.ogg');
        Level.loadImages(['tank.png', 'bot-simple.png', 'flag.png']).then(images=> {
            this.sidebarImages = images;
        });

        this.loadLevel();

        document.body.querySelectorAll('.nav-level li').forEach(el => {
            el.addEventListener('click', (e: any) => {
                let level = e.currentTarget.getAttribute('data-id');
                level = parseInt(level);
                this.cleanScene();
                this.state = new State();
                this.state.activeLevel = level;
                this.markForGameOver = false;
                this.loadLevel();
            });
        })

        document.addEventListener('keydown', (e) => {
            if (e.keyCode === 80 && this.markForGameOver === false) {
                this.pause();
            }
        });

        this.sidebarContext = this.sidebar.getContext('2d');
        this.sidebar.width = 150;
        this.sidebar.height = WINDOW_SIZE;
        document.body.querySelector('.container').appendChild(this.sidebar);

        this.addPlayer();
    }

    async addPlayer() {
        let images = await Level.loadImages(['tank.png', 'tank_improved.png', 'tank_superb.png', 'tank_god.png']);

        this.player = new Player(images);
        this.player.addEventListeners();
    }

    pause() {
        this.paused = !this.paused;
        if (this.paused === false) {
            this.startUpdate();
        } else {
            this.update(null);
            this.context.fillStyle = "#000";
            this.context.fillStyle = "rgba(0, 0, 0, 0.8)";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.context.fillStyle = "white";
            this.context.font = `bold ${WINDOW_SIZE / 20}px Arial`;
            this.context.fillText('PAUSE', this.canvas.width / 2 - TILE_SIZE * 1.2, this.canvas.height / 2);
        }
    }

    get currentLevel() {
        return this.state.levels[this.state.activeLevel];
    }

    async loadLevel() {
        this.level = new Level();

        this.tiles = await this.level.build(this.state.activeLevel);

        if (this.tiles) {
            // AudioController.play('tanks/sounds/gamestart.ogg');
            this.generateAvailableBots();

            this.startUpdate();
        } else {
            this.context.fillStyle = "blue  ";
            this.context.font = `bold ${WINDOW_SIZE / 20}px Arial`;
            this.context.fillText('YOU WIN', (this.canvas.width / 2) - 100, (this.canvas.height / 2));
        }

    }
    //TODO PAUSE 
    generateAvailableBots() {
        for (let i = 1; i <= this.currentLevel.startWithBots; i++) {
            let timeout = setTimeout(() => {
                this.addNewBot();
            }, i * 2000);
            this.gameTimeouts.push(timeout);
        }
    }

    cleanScene(): void {
        this.gameCallback = () => { };
        this.gameTimeouts.forEach(timeout => clearTimeout(timeout));

        this.bullets = [];
        this.enemies = [];
        this.tiles = [];
        this.bonuses = [];

        this.markForNextLevel = false;

        this.player.positionReset();
    }

    nextLevel(): void {
        this.cleanScene();
        this.state.activeLevel++;
        this.loadLevel();
    }

    restart(): void {
        this.cleanScene();
        this.state = new State();
        this.addPlayer();

        this.context.fillStyle = "rgba(0, 0, 0, 0.8)";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.fillStyle = "red";
        this.context.font = `bold ${WINDOW_SIZE / 20}px Arial`;
        this.context.fillText('GAME OVER', (this.canvas.width / 2) - 140, (this.canvas.height / 2));
    }

    async addNewBot() {
        const { mod, img } = await Bot.generateMod();
        const bonus = Bot.generateBonus();
        this.enemies.push(new Bot(img, mod, bonus));
    }

    async addNewBonus(bonus, x1, y1, x2, y2) {
        const img = await Bot.getBonusImage(bonus);
        let item = this.level.matrix.searchByRange(x1, y1, x2, y2);
        this.bonuses.push(new Bonus(img, bonus, item[0], item[1]));
    }

    startUpdate(): void {
        let lastTime;
        this.gameCallback = (ms?: number) => {
            if (this.paused === false) {
                if (lastTime) {
                    this.update((ms - lastTime) / 1000);
                }
                lastTime = ms;
                requestAnimationFrame(this.gameCallback);
            }

        }
        this.gameCallback();
    }

    draw(): void {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);


        this.tiles = this.tiles.filter(r => !r.markForDeletion);
        this.tiles.filter(r => r instanceof GrassTile === false).forEach(brick => brick.draw(this.context));

        this.bullets = this.bullets.filter(r => !r.markForDeletion);
        this.bullets.forEach(bullet => bullet.draw(this.context));

        this.enemies = this.enemies.filter(r => !r.markForDeletion);
        this.enemies.forEach(enemy => enemy.draw(this.context));

        this.bonuses = this.bonuses.filter(r => !r.markForDeletion);
        this.bonuses.forEach(bonus => bonus.draw(this.context));

        this.player.draw(this.context);

        this.tiles.filter(r => r instanceof GrassTile === true).forEach(brick => brick.draw(this.context));
    }

    drawScores() {
        if(this.sidebarImages.length) {
            this.sidebarContext.clearRect(0,0, 150, WINDOW_SIZE);
            this.sidebarContext.fillStyle = "black";
            this.sidebarContext.font = `normal ${WINDOW_SIZE / 42}px Arial`;
            this.sidebarContext.fillText((this.currentLevel.maxScores - this.currentLevel.scores), 60, 30);
    

            this.sidebarContext.fillStyle = "black";
            this.sidebarContext.font = `normal ${WINDOW_SIZE / 42}px Arial`;
            this.sidebarContext.fillText(this.player.lifes, 60, WINDOW_SIZE/ 2 + 80);

            this.sidebarContext.fillStyle = "black";
            this.sidebarContext.font = `normal ${WINDOW_SIZE / 42}px Arial`;
            this.sidebarContext.fillText('Lvl ' + (this.state.activeLevel + 1), 50, WINDOW_SIZE - 20);
    
   
    
            this.sidebarContext.drawImage(
                this.sidebarImages[1],
                10,
                0,
                40,
                40,
            );

    
            this.sidebarContext.drawImage(
                this.sidebarImages[0],
                10,
                WINDOW_SIZE/ 2  + 50,
                40,
                40,
            );

                        
            this.sidebarContext.drawImage(
                this.sidebarImages[2],
                10,
                WINDOW_SIZE - 50,
                40,
                40,
            );

                
        }
    }

    collider(): void {
        this.bullets.forEach(bullet => bullet.collision(this.player, this));
    }

    update(dt): void {
        this.player.update(dt, this);
        this.enemies.forEach(enemy => enemy.update(dt, this));
        this.bonuses.forEach(bonus => bonus.update(dt));

        // console.log(this.player['bulletSpeedFactor']);
        this.context.globalAlpha = 1;
        if (dt) {
            this.bullets.forEach(bullet => {
                bullet.pos.x += bullet.vel.x * dt;
                bullet.pos.y += bullet.vel.y * dt;
            });

            this.collider();

            this.draw();
            this.drawScores();

            if (this.markForNextLevel) {
                this.nextLevel();
            }

            if (this.markForGameOver) {
                this.restart();
            }
        }

    }

}
const canvas = <HTMLCanvasElement>document.getElementById('tanks');
new Game(canvas);