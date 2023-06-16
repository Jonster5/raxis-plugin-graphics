import { ECS, ECSPlugin, EntityControls, Vec2 } from 'raxis-core';
import { Time, TimeData } from 'raxis-plugin-time';
import { Transform } from 'raxis-plugin-transform';
import { TreeNode } from './treenode';
import {
    Canvas,
    updateCanvasZoom,
    setupCanvas,
    updateCanvasDimensions,
} from './canvas';
import { Sprite, Root } from './sprite';

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
    }, delay) as unknown as number;
}

export function stopImageAnimation(sprite: Sprite) {
    if (sprite.shifter !== undefined) clearInterval(sprite.shifter);
    sprite.shifter = undefined;
}

export function gotoImageFrame(sprite: Sprite, index: number) {
    sprite.ci = index;
}

export function globalPos(entity: EntityControls): Vec2 {
    const [node, t] = entity.get(TreeNode, Transform);

    if (node.parent) {
        return globalPos(entity.ecs().controls(node.parent)).add(t.pos);
    } else {
        return new Vec2(0, 0);
    }
}

function checkGraphicsCompatibility(ecs: ECS) {
    const hasTime = !!ecs.getResource(Time);
    const hasTimeData = !!ecs.getResource(TimeData);

    const hasTransform = ecs.hasComponent(Transform);

    if (!hasTime || !hasTimeData) {
        throw new Error(
            `raxis-plugin-graphics requires plugin [raxis-plugin-time]`,
        );
    }

    if (!hasTransform) {
        throw new Error(
            `raxis-plugin-graphics requires plugin [raxis-plugin-transform]`,
        );
    }
}

export const GraphicsPlugin: ECSPlugin = {
    components: [Canvas, TreeNode, Sprite, Root],
    startup: [checkGraphicsCompatibility, setupCanvas],
    systems: [updateCanvasDimensions, updateCanvasZoom, render],
    resources: [],
};
