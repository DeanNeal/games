import './tanks.less';
import { Tile, GrassTile } from './tile';
import { Bullet } from './bullet';
import { Player } from './player';
import AudioController from './audio';
import { Level } from './levels';
import { Eagle } from './eagle';
import { Bot } from './bot';

import { WINDOW_SIZE, TILE_SIZE, BULLET_SPEED } from './global';

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
        maxScores: 5,
        startWithBots: 2
    }, {
        scores: 0,
        maxScores: 7,
        startWithBots: 3
    }, {
        scores: 0,
        maxScores: 10,
        startWithBots: 3
    }];
}

class Game {
    private canvas: HTMLCanvasElement;
    private context;
    private player: Player;
    private enemies: Bot[] = [];

    private bullets: Bullet[] = [];
    private tiles: Tile[] = [];
    private eagle: Eagle;

    // public markForRestart: boolean = false;
    public markForNextLevel: boolean = false;
    public markForGameOver: boolean = false;

    public state: IState = new State();

    private gameCallback;
    private loadLevelTimeout: number;
    private gameTimeouts: number[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        canvas.width = WINDOW_SIZE;
        canvas.height = WINDOW_SIZE;

        this.loadLevel();
    }

    get currentLevel() {
        return this.state.levels[this.state.activeLevel];
    }

    loadLevel(): void {
        const level = new Level();

        level.build(this.state.activeLevel).then((tiles: Tile[]) => {
            if (tiles) {
                this.tiles = tiles;
            } else {
                this.context.fillStyle = "blue  ";
                this.context.font = `bold ${WINDOW_SIZE / 20}px Arial`;
                this.context.fillText('YOU WIN', (this.canvas.width / 2) - 100, (this.canvas.height / 2));
            }
        }).then(res => {
            if (this.tiles.length) {
                Level.loadImages(['img/tanks/tank.png', 'img/tanks/eagle.png']).then(images => {
                    this.player = new Player(images[0], TILE_SIZE - 10, TILE_SIZE - 10);

                    this.eagle = new Eagle(images[1], TILE_SIZE, TILE_SIZE, this.canvas.width / 2 - TILE_SIZE / 2, this.canvas.height - TILE_SIZE);


                    for (let i = 0; i < this.currentLevel.startWithBots; i++) {
                        let timeout = setTimeout(() => {
                            this.addNewBot();
                        }, i * 2000);
                        this.gameTimeouts.push(timeout);
                    }

                    this.player.addEventListeners();

                    this.startUpdate();
                });
            }

        })
    }

    cleanScene(): void {
        this.gameTimeouts.forEach(timeout => clearTimeout(timeout));

        this.bullets = [];
        this.enemies = [];
        this.tiles = [];
        this.player = null;
        this.eagle = null;

        this.markForNextLevel = false;
        this.markForGameOver = false;
        this.context.fillStyle = '#000';

        this.gameCallback = () => { };
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    nextLevel(): void {
        this.cleanScene();
        this.state.activeLevel++;
        this.loadLevel();
    }

    restart(): void {
        this.cleanScene();
        this.state = new State();

        this.context.fillStyle = "red";
        this.context.font = `bold ${WINDOW_SIZE / 20}px Arial`;
        this.context.fillText('GAME OVER', (this.canvas.width / 2) - 140, (this.canvas.height / 2));
        // this.gameTimeouts.push(setTimeout(() => {
        //     this.loadLevel();
        // }, 2000));
    }

    addNewBot(): void {
        Level.loadImg('img/tanks/tank.png').then(img => {
            this.enemies.push(new Bot(img, TILE_SIZE - 10, TILE_SIZE - 10));
        });
    }

    startUpdate(): void {
        let lastTime;
        this.gameCallback = (ms?: number) => {
            if (lastTime) {
                this.update((ms - lastTime) / 1000);
            }
            lastTime = ms;
            requestAnimationFrame(this.gameCallback);
        }
        this.gameCallback();
    }

    draw(): void {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);


        this.tiles = this.tiles.filter(r => !r.markForDeletion);
        this.tiles.filter(r=> r instanceof GrassTile === false).forEach(brick => brick.draw(this.context));

        this.bullets = this.bullets.filter(r => !r.markForDeletion);
        this.bullets.forEach(bullet => bullet.draw(this.context));

        this.enemies = this.enemies.filter(r => !r.markForDeletion);
        this.enemies.forEach(enemy => enemy.draw(this.context));

        this.player.draw(this.context);

        this.tiles.filter(r=> r instanceof GrassTile === true).forEach(brick => brick.draw(this.context));
    
        this.eagle.draw(this.context);
    }

    drawScores() {
        this.context.fillStyle = "blue";
        this.context.font = `bold ${WINDOW_SIZE / 42}px Arial`;
        this.context.fillText('Destroyed - ' + this.currentLevel.scores, (this.canvas.width) - WINDOW_SIZE / 6, (this.canvas.height) - WINDOW_SIZE / 50);

        this.context.fillStyle = "blue";
        this.context.font = `bold ${WINDOW_SIZE / 42}px Arial`;
        this.context.fillText('Level - ' + (this.state.activeLevel + 1), (this.canvas.width) - WINDOW_SIZE / 6, (this.canvas.height) - WINDOW_SIZE / 20);

        this.context.fillStyle = "blue";
        this.context.font = `bold ${WINDOW_SIZE / 42}px Arial`;
        this.context.fillText('Lives - ' + this.player.lives, (this.canvas.width) - WINDOW_SIZE / 6, (this.canvas.height) - WINDOW_SIZE / 12.5);
    }

    collider(): void {
        this.bullets.forEach(bullet => bullet.collision(this.player, this));
    }

    update(dt): void {
        this.player.update(dt, this.tiles, this);
        this.enemies.forEach(enemy => enemy.update(dt, this.tiles, this));

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
const canvas = <HTMLCanvasElement>document.getElementById('tanks');
new Game(canvas);

//TODO
//MOVE SOUND
//BONUSES
