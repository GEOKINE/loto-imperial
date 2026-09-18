// LOTO IMPERIAL - Sequence Animation System

export class ImageSequence {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.baseUrl = config.url;
        this.prefix = config.prefix || '';
        this.frameCount = config.frameCount;
        this.padding = config.padding || 0;
        this.extension = config.extension || 'png';

        this.images = [];
        this.currentFrame = 0;
        this.isLoaded = false;
        this.opacity = 1;

        this.init();
    }

    async init() {
        console.log(`Initializing sequence: ${this.baseUrl}`);
        try {
            const loadPromises = [];
            for (let i = 0; i < this.frameCount; i++) {
                const frameNum = i.toString().padStart(this.padding, '0');
                const url = `${this.baseUrl}/${this.prefix}${frameNum}.${this.extension}`;
                loadPromises.push(this.loadImage(url));
            }
            this.images = await Promise.all(loadPromises);
            this.isLoaded = true;
            console.log(`Sequence loaded successfully: ${this.frameCount} frames`);
            this.resize();
            this.render();
            window.addEventListener('resize', () => this.resize());
        } catch (e) {
            console.error("CRITICAL ERROR loading image sequence:", e);
        }
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load: ${url}`));
            img.src = url;
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    setFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.frameCount - 1));
        if (this.isLoaded) {
            this.render();
        }
    }

    setOpacity(val) {
        this.opacity = val;
        this.render();
    }

    render() {
        if (!this.isLoaded) return;
        const img = this.images[this.currentFrame];
        if (!img) return;

        const canvasAspect = this.canvas.width / this.canvas.height;
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (canvasAspect > imgAspect) {
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imgAspect;
            offsetY = (this.canvas.height - drawHeight) / 2;
        } else {
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imgAspect;
            offsetX = (this.canvas.width - drawWidth) / 2;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = this.opacity;
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        this.ctx.globalAlpha = 1.0;
    }
}

export class SequenceManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.sequences = {};
        this.currentSeqId = null;
    }

    async addSequence(id, config) {
        const seq = new ImageSequence(this.canvasId, config);
        this.sequences[id] = seq;
        await seq.init();
        return seq;
    }

    setFrame(id, frame) {
        if (this.sequences[id]) {
            this.sequences[id].setFrame(frame);
        }
    }

    setOpacity(id, opacity) {
        if (this.sequences[id]) {
            this.sequences[id].setOpacity(opacity);
        }
    }

    async transitionTo(id) {
        if (this.currentSeqId === id) return;

        const prevId = this.currentSeqId;
        this.currentSeqId = id;

        if (prevId && this.sequences[prevId]) {
            gsap.to(this.sequences[prevId], {
                opacity: 0,
                duration: 0.5,
                onUpdate: () => this.sequences[prevId].setOpacity(this.sequences[prevId].opacity)
            });
        }

        if (this.sequences[id]) {
            this.sequences[id].opacity = 0;
            this.sequences[id].render();
            gsap.to(this.sequences[id], {
                opacity: 1,
                duration: 0.5,
                onUpdate: () => this.sequences[id].setOpacity(this.sequences[id].opacity)
            });
        }
    }
}
