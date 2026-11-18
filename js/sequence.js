// LOTO IMPERIAL - Sequence Animation System
// Optimizado para carga instantánea del frame inicial y streaming progresivo por lotes

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
        this.onProgress = config.onProgress || null;
        this.onInitialReady = config.onInitialReady || null;

        this.images = new Array(this.frameCount).fill(null);
        this.currentFrame = 9; // Inicia en el frame clave
        this.isLoaded = false;
        this.opacity = 1;
        this.initialRenderDone = false;

        this.init();
    }

    getFrameUrl(index) {
        const frameNum = index.toString().padStart(this.padding, '0');
        return `${this.baseUrl}/${this.prefix}${frameNum}.${this.extension}`;
    }

    async init() {
        console.log(`Initializing sequence: ${this.baseUrl}`);
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 1. CARGA PRIORITARIA: Frame inicial (Frame 9) para pintado inmediato
        try {
            const initialImg = await this.loadImage(this.getFrameUrl(9));
            this.images[9] = initialImg;
            this.currentFrame = 9;
            this.render();
            this.initialRenderDone = true;
            if (this.onInitialReady) {
                this.onInitialReady();
            }
        } catch (err) {
            console.warn('[Sequence] Falló frame inicial 9:', err.message);
        }

        // 2. CARGA PROGRESIVA POR LOTES (Sin saturar la red ni bloquear platillos)
        let loadedCount = this.images[9] ? 1 : 0;
        const total = this.frameCount;

        const loadSingle = async (idx) => {
            if (this.images[idx]) return this.images[idx];
            try {
                const img = await this.loadImage(this.getFrameUrl(idx));
                this.images[idx] = img;
            } catch (err) {
                // Tolerante si algún frame remoto falla
            } finally {
                loadedCount++;
                if (this.onProgress) {
                    this.onProgress(loadedCount, total);
                }
            }
        };

        // Descarga en lotes controlados de 6 para dejar ancho de banda a platillos y menú
        const batchSize = 6;
        for (let i = 0; i < total; i += batchSize) {
            const batch = [];
            for (let j = i; j < Math.min(i + batchSize, total); j++) {
                if (j !== 9) {
                    batch.push(loadSingle(j));
                }
            }
            await Promise.all(batch);
        }

        this.isLoaded = true;
        console.log(`Sequence loaded successfully: ${total} frames`);
        this.render();
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
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    setFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.frameCount - 1));
        this.render();
    }

    setOpacity(val) {
        this.opacity = val;
        this.render();
    }

    render() {
        if (!this.canvas || !this.ctx) return;

        // Selección inteligente de frame: si el frame exacto no ha cargado aún,
        // renderiza el fotograma vecino más próximo para que nunca se vea vacío
        let img = this.images[this.currentFrame];
        if (!img) {
            for (let offset = 1; offset < 20; offset++) {
                if (this.currentFrame - offset >= 0 && this.images[this.currentFrame - offset]) {
                    img = this.images[this.currentFrame - offset];
                    break;
                }
                if (this.currentFrame + offset < this.frameCount && this.images[this.currentFrame + offset]) {
                    img = this.images[this.currentFrame + offset];
                    break;
                }
            }
        }
        if (!img && this.images[9]) img = this.images[9];
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
