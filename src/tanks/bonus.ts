import { Rect } from "./rect";
import { TILE_SIZE, WINDOW_SIZE } from "./global";

const offset = TILE_SIZE * 0.4;
export class Bonus extends Rect {
    public markForDeletion: boolean = false;
    public img: HTMLImageElement;
    public type: string;
    constructor(img: HTMLImageElement, bonus: string, x: number, y: number) {
        super(TILE_SIZE - offset, TILE_SIZE - offset);
        this.img = img;
        this.pos.x = x + offset / 2;
        this.pos.y = y + offset / 2;
        this.type = bonus;
        //TODO PAUSE
        setTimeout(() => {
            this.markForDeletion = true;
        }, 7000);
    }

    update(dt: number) {
        if (dt) {

        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.drawImage(
            this.img,
            this.pos.x,
            this.pos.y,
            this.size.x,
            this.size.y
        );
    }
}