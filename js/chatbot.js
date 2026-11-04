// LOTO IMPERIAL - AI Chatbot System
// Using a decision-tree "neural network" for guided luxury interaction

export const CHAT_TREE = {
    start: {
        text: "Bienvenido a Loto Imperial, el corazón de Asia en la Ciudad de México. Soy su asistente virtual. ¿En qué puedo asistirle hoy?",
        options: [
            { text: "Ver Menú", next: "menu" },
            { text: "Hacer Reserva", next: "reserve" },
            { text: "Ubicación y Contacto", next: "location" }
        ]
    },
    menu: {
        text: "Nuestra gastronomía es un viaje sensorial. ¿Cuál de nuestras regiones desea explorar?",
        options: [
            { text: "Cocina Japonesa", next: "menu_japones" },
            { text: "Cocina China", next: "menu_chino" },
            { text: "Sudeste Asiático", next: "menu_sudeste" },
            { text: "Volver al inicio", next: "start" }
        ]
    },
    menu_japones: {
        text: "La cocina japonesa es la esencia de la pureza. Le recomiendo nuestro Omakase Premium y el Ramen Tonkotsu. ¿Desea ver el menú completo?",
        options: [
            { text: "Ir al Menú", action: () => { window.location.hash = 'menu'; document.getElementById('menu').scrollIntoView({behavior: 'smooth'}); } },
            { text: "Volver", next: "menu" }
        ]
    },
    menu_chino: {
        text: "Nuestra cocina china es imperial y audaz. El Pato Pekín es nuestra especialidad más solicitada. ¿Desea ver los platos?",
        options: [
            { text: "Ir al Menú", action: () => { window.location.hash = 'menu'; document.getElementById('menu').scrollIntoView({behavior: 'smooth'}); } },
            { text: "Volver", next: "menu" }
        ]
    },
    menu_sudeste: {
        text: "El Sudeste Asiático ofrece una explosión de sabores cítricos y picantes, como nuestro Pad Thai Real. ¿Desea explorar más?",
        options: [
            { text: "Ir al Menú", action: () => { window.location.hash = 'menu'; document.getElementById('menu').scrollIntoView({behavior: 'smooth'}); } },
            { text: "Volver", next: "menu" }
        ]
    },
    reserve: {
        text: "Será un honor recibirle en nuestras mesas. Le redirigiré ahora mismo a nuestro sistema de reservas imperiales.",
        options: [
            { text: "Ir a Reservas", action: () => { window.location.hash = 'reserve'; document.getElementById('reserve').scrollIntoView({behavior: 'smooth'}); } },
            { text: "Volver al inicio", next: "start" }
        ]
    },
    location: {
        text: "Nos encontramos en el Distrito Gastronómico Oriental, Ciudad de México. Esperamos su visita muy pronto.",
        options: [
            { text: "Ir a Contacto", action: () => { window.location.hash = 'contact'; document.getElementById('contact').scrollIntoView({behavior: 'smooth'}); } },
            { text: "Volver al inicio", next: "start" }
        ]
    }
};

export class LotoChat {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.voiceId = config.voiceId; // Voice ID for a luxury female voice
        this.modelId = 'eleven_multilingual_v2';
        this.currentNodo = 'start';
        this.initUI();
    }

    initUI() {
        // Create Chat Bubble
        const bubble = document.createElement('div');
        bubble.id = 'chat-bubble';
        bubble.innerHTML = `<i class="fa-solid fa-comment-dots"></i>`;
        document.body.appendChild(bubble);

        // Create Chat Window
        const windowEl = document.createElement('div');
        windowEl.id = 'chat-window';
        windowEl.classList.add('hidden');
        windowEl.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <img src="img/icons/LOGO.svg" style="width: 30px; height: 30px;">
                    <span>Togui - Asistente Imperial</span>
                </div>
                <span class="close-chat">&times;</span>
            </div>
            <div class="chat-body" id="chat-body"></div>
            <div class="chat-footer" id="chat-footer"></div>
        `;
        document.body.appendChild(windowEl);

        // Events
        bubble.addEventListener('click', () => {
            windowEl.classList.toggle('hidden');
            if (!windowEl.classList.contains('hidden')) {
                this.renderNode('start');
            }
        });

        windowEl.querySelector('.close-chat').addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            windowEl.classList.add('hidden');
        });
    }

    async renderNode(nodeId) {
        this.currentNodo = nodeId;
        const node = CHAT_TREE[nodeId];
        const body = document.getElementById('chat-body');
        const footer = document.getElementById('chat-footer');

        // 1. Display Text
        const msg = document.createElement('div');
        msg.className = 'chat-msg ai-msg';
        msg.innerText = node.text;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;

        // 2. Speak text with Web Speech API (FREE & UNLIMITED)
        await this.speak(node.text);

        // 3. Render Options
        footer.innerHTML = '';
        node.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'chat-opt-btn';
            btn.innerText = opt.text;
            btn.onclick = async () => {
                if (opt.action) {
                    opt.action();
                } else {
                    this.renderNode(opt.next);
                }
            };
            footer.appendChild(btn);
        });
    }

    async speak(text) {
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();

            // Find a female Spanish voice
            const spanishVoice = voices.find(voice =>
                (voice.lang === 'es-ES' || voice.lang === 'es-MX') &&
                (voice.name.toLowerCase().includes('female') ||
                 voice.name.toLowerCase().includes('google') ||
                 voice.name.toLowerCase().includes('microsoft') ||
                 voice.name.toLowerCase().includes('zira'))
            );

            if (spanishVoice) {
                utterance.voice = spanishVoice;
            }

            utterance.pitch = 1.1;
            utterance.rate = 0.9;
            utterance.volume = 1;

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error('System Voice error:', e);
        }
    }
}
