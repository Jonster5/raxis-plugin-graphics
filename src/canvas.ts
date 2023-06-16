import { Vec2, ECS } from 'raxis-core';
import { Transform } from 'raxis-plugin-transform';
import { Sprite, Root } from './sprite';
import { TreeNode } from './treenode';

export class GraphicsSettings {
    constructor(
        public settings: {
            target: HTMLElement;
            width: number;
            height: number;
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
        public zoom: number,
        public def: DOMMatrix,
        public root: number | null,
        public last: {
            zoom: number;
            tcw: number;
            tch: number;
        },
    ) {}
}

export function updateCanvasZoom(ecs: ECS) {
    const canvas: Canvas = ecs.queryComponents(Canvas)[0];
    const { target, element, ctx, size, zoom, last } = canvas;

    if (zoom === last.zoom) return;

    const zratio = zoom / last.zoom;

    const width = size.width * zratio;

    const dpr = window.devicePixelRatio ?? 1;
    const aspect = target.clientHeight / target.clientWidth;

    const nsize = new Vec2(width, width * aspect);

    element.width = nsize.width * dpr;
    element.height = nsize.height * dpr;
    ctx.setTransform(dpr, 0, 0, -dpr, element.width / 2, element.height / 2);

    canvas.aspect = aspect;
    canvas.size = nsize;
    canvas.def = ctx.getTransform();

    last.zoom = zoom;
}

export function updateCanvasDimensions(ecs: ECS) {
    const canvas: Canvas = ecs.queryComponents(Canvas)[0];
    const { target, element, ctx, size, last } = canvas;

    if (target.clientWidth === last.tcw && target.clientHeight === last.tch)
        return;

    const dpr = window.devicePixelRatio ?? 1;
    const aspect = target.clientHeight / target.clientWidth;

    const nsize = new Vec2(size.width, size.width * aspect);

    element.width = nsize.width * dpr;
    element.height = nsize.height * dpr;
    ctx.setTransform(dpr, 0, 0, -dpr, element.width / 2, element.height / 2);

    canvas.size = nsize;
    canvas.last.tcw = target.clientWidth;
    canvas.last.tch = target.clientHeight;
    canvas.def = ctx.getTransform();
}

export function setupCanvas(ecs: ECS) {
    const { target, width, rendering } = (
        ecs.getResource(GraphicsSettings) as GraphicsSettings
    ).settings ?? {
        width: 1000,
        target: document.body,
        rendering: 'crisp-edges',
    };

    const element = document.createElement('canvas');
    const ctx = element.getContext('2d')!;

    const dpr = window.devicePixelRatio ?? 1;
    const aspect = target.clientHeight / target.clientWidth;
    const tcw = target.clientWidth,
        tch = target.clientHeight;

    const size = new Vec2(width, width * aspect).freeze();

    const zoom = 1;

    element.width = size.width * dpr;
    element.height = size.height * dpr;
    ctx.setTransform(dpr, 0, 0, -dpr, element.width / 2, element.height / 2);

    const def = ctx.getTransform();

    element.setAttribute(
        'style',
        `display: block; width: 100%; height: 100%; border: none; background: transparent; image-rendering: ${rendering}`,
    );

    element.addEventListener('contextmenu', (e) => e.preventDefault());

    target.appendChild(element);

    const root = ecs
        .entity()
        .add(new Sprite('none'), new Transform(), new TreeNode(), new Root());

    const canvas = ecs
        .entity()
        .add(
            new Canvas(
                target,
                element,
                ctx,
                aspect,
                size,
                zoom,
                def,
                root.id(),
                { zoom, tcw, tch },
            ),
        );
}
