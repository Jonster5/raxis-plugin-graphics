import { ECS, ECSPlugin, Vec2 } from 'raxis-core';
import { Time } from './time';
import { TreeNode } from './treenode';

export class GraphicsSettings {
    constructor(
        public settings: {
            target: HTMLElement;
            width: number;
            rendering?: 'crisp-edges' | 'pixelated';
        },
    ) {}
}

export class Canvas {
    constructor(
        public target: HTMLElement,
        public element: HTMLCanvasElement,
        public ctx: CanvasRenderingContext2D,
        public aspect: number,
        public size: Vec2,
        public def: DOMMatrix,
        public root: number | null,
    ) {}
}

export class RenderData {
    constructor(
        public ups: number = 30,
        public lagOffset: number = 0,
        public last: number = 0,
        public lag: number = 0,
    ) {}
}

export class Root {}

export class Sprite {
    constructor(
        public type: 'rectangle' | 'ellipse' | 'image' | 'none',
        public material:
            | string
            | CanvasGradient
            | CanvasPattern
            | HTMLImageElement[]
            | undefined = undefined,
        public visible: boolean = true,
        public filter: string = 'none',
        public alpha: number = 1,
        public borderColor: string = 'none',
        public borderWidth: number = 0,

        public shifter: number | undefined = undefined,
        public delay: number | undefined = 100,
        public ci: number | undefined = 0,
    ) {}
}

function setupCanvas(ecs: ECS) {
    const { target, width, rendering } = (
        ecs.getResource(GraphicsSettings) as GraphicsSettings
    ).settings;

    const element = document.createElement('canvas');
    const ctx = element.getContext('2d')!;

    const dpr = window.devicePixelRatio ?? 1;

    const aspect = window.innerHeight / window.innerWidth;

    const size = new Vec2(width, width * aspect);

    element.width = size.x * dpr;
    element.height = size.y * dpr;
    ctx.transform(dpr, 0, 0, -dpr, element.width / 2, element.height / 2);

    const def = ctx.getTransform();

    element.setAttribute(
        'style',
        `display: block; width: 100%; height: 100%; border: none; background: transparent; image-rendering: ${
            rendering ?? 'crisp-edges'
        }`,
    );

    element.addEventListener('contextmenu', (e) => e.preventDefault());

    target.appendChild(element);

    const root = ecs
        .entity()
        .add(new Sprite('none'), new Transform(), new TreeNode(), new Root());

    const canvas = ecs
        .entity()
        .add(new Canvas(target, element, ctx, aspect, size, def, root.id()));

    root.getComponent(TreeNode).parent = canvas.id();
}

function render(ecs: ECS) {
    const canvas: Canvas = ecs.queryComponents(Canvas)[0];
    const time: Time = ecs.getResource(Time);

    const { ctx } = canvas;

    canvas.ctx.setTransform(canvas.def);

    canvas.ctx.clearRect(
        -canvas.size.x,
        -canvas.size.y,
        canvas.size.x * 2,
        canvas.size.y * 2,
    );

    draw(time, canvas.root!);

    function draw(time: Time, sid: number) {
        const [sprite, transform, node] = ecs
            .controls(sid)
            .get(Sprite, Transform, TreeNode) as [Sprite, Transform, TreeNode];

        const { pos, angle, size } = transform;

        const save = ctx.getTransform();

        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        if (sprite.type === 'rectangle') drawRectangle(ctx, sprite, size);
        else if (sprite.type === 'ellipse') drawEllipse(ctx, sprite, size);
        else if (sprite.type === 'image') drawImage(ctx, sprite, size);

        if (node.children && node.children.length > 0) {
            for (let child of node.children) draw(time, child);
        }

        ctx.setTransform(save);
    }
}

function drawRectangle(
    ctx: CanvasRenderingContext2D,
    sprite: Sprite,
    size: Vec2,
) {
    ctx.filter = sprite.filter;
    ctx.globalAlpha = sprite.alpha;

    ctx.save();
    ctx.scale(1, -1);

    ctx.beginPath();
    ctx.rect(-size.x / 2, -size.y / 2, size.x, size.y);

    if (sprite.material) {
        ctx.fillStyle = sprite.material as
            | string
            | CanvasGradient
            | CanvasPattern;
        ctx.fill();
    }
    if (sprite.borderColor && sprite.borderWidth) {
        ctx.strokeStyle = sprite.borderColor;
        ctx.lineWidth = sprite.borderWidth;
        ctx.stroke();
    }

    ctx.restore();
}

function drawEllipse(
    ctx: CanvasRenderingContext2D,
    sprite: Sprite,
    size: Vec2,
) {
    ctx.filter = sprite.filter;
    ctx.globalAlpha = sprite.alpha;

    ctx.save();
    ctx.scale(1, -1);

    ctx.beginPath();
    ctx.ellipse(0, 0, size.x / 2, size.y / 2, 0, 0, 2 * Math.PI);
    if (sprite.material) {
        ctx.fillStyle = sprite.material as
            | string
            | CanvasGradient
            | CanvasPattern;
        ctx.fill();
    }
    if (sprite.borderColor && sprite.borderWidth) {
        ctx.strokeStyle = sprite.borderColor;
        ctx.lineWidth = sprite.borderWidth;
        ctx.stroke();
    }

    ctx.restore();
}

function drawImage(ctx: CanvasRenderingContext2D, sprite: Sprite, size: Vec2) {
    if (!sprite.material || !sprite.ci) return;

    ctx.filter = sprite.filter;
    ctx.globalAlpha = sprite.alpha;

    ctx.save();
    ctx.scale(1, 1);

    ctx.beginPath();
    ctx.drawImage(
        (sprite.material as CanvasImageSource[])[sprite.ci],
        -size.x / 2,
        -size.y / 2,
        size.x,
        size.y,
    );

    ctx.restore();
}

export function startImageAnimation(sprite: Sprite, delay: number) {
    if (sprite.type !== 'image') return;
    if (!sprite.ci) sprite.ci = 0;

    sprite.shifter = setInterval(() => {
        sprite.ci!++;
        if (sprite.ci! >= (sprite.material as HTMLImageElement[]).length)
            sprite.ci! = 0;
    }, delay);
}

export function stopImageAnimation(sprite: Sprite) {
    if (sprite.shifter !== undefined) clearInterval(sprite.shifter);
    sprite.shifter = undefined;
}

export function gotoImageFrame(sprite: Sprite, index: number) {
    sprite.ci = index;
}

export const GraphicsPlugin: ECSPlugin = {
    components: [Canvas, Transform, TreeNode, Sprite, Root],
    startup: [setupCanvas],
    systems: [render, updateTransform],
    resources: [new GameSettings(1)],
};
