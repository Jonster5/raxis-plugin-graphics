import { ECS, EntityControls } from 'raxis-core';

export class TreeNode {
    constructor(
        public parent: number | null = null,
        public children: number[] = [],
    ) {}

    onDestroy(ecs: ECS, eid: number) {
        if (!this.parent) return;

        removeChild(ecs.controls(this.parent), ecs.controls(eid));
    }
}

export function addChild(parent: EntityControls, child: EntityControls) {
    const pt: TreeNode = parent.getComponent(TreeNode);
    const ct: TreeNode = child.getComponent(TreeNode);

    pt.children.push(child.id());
    ct.parent = parent.id();
}

export function addChildren(
    parent: EntityControls,
    ...children: EntityControls[]
) {
    children.forEach((child) => addChild(parent, child));
}

export function removeChild(parent: EntityControls, child: EntityControls) {
    const pt: TreeNode = parent.getComponent(TreeNode);
    const ct: TreeNode = child.getComponent(TreeNode);

    pt.children.splice(pt.children.indexOf(child.id()), 1);
    if (ct !== undefined) ct.parent = null;
}
