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

export class Root {}
