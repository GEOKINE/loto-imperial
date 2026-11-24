const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const old = `              <!-- URL de Imagen -->
              <div>
                <label class="block text-xs font-serif uppercase tracking-wider text-imperial-gold mb-1.5">URL de Imagen</label>
                <input
                  type="text"
                  id="dishImageUrl"
                  placeholder="img/menu/mi-platillo.jpeg o URL web"
                  class="w-full bg-[#120505] border border-imperial-gold/40 rounded-xl px-4 py-2.5 text-sm text-imperial-cream outline-none focus:border-imperial-gold"
                />
              </div>
            </div>`;

const newBlock = `              <!-- URL de Imagen (campo completo con preview) -->
              <div class="md:col-span-3">
                <label class="block text-xs font-serif uppercase tracking-wider text-imperial-gold mb-1.5">URL de Imagen</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    id="dishImageUrl"
                    autocomplete="off"
                    autocorrect="off"
                    spellcheck="false"
                    placeholder="https://ejemplo.com/imagen.jpg  o  img/menu/platillo.jpeg"
                    class="flex-1 bg-[#120505] border border-imperial-gold/40 rounded-xl px-4 py-2.5 text-sm text-imperial-cream outline-none focus:border-imperial-gold"
                  />
                  <button type="button" id="btnPreviewImage" title="Ver preview de imagen" class="px-3 py-2 rounded-xl border border-imperial-gold/40 bg-[#1c0808] text-imperial-gold hover:border-imperial-gold transition-all shrink-0">
                    <i class="fa-solid fa-eye text-sm"></i>
                  </button>
                </div>
                <!-- Preview de imagen en vivo -->
                <div id="dishImagePreviewRow" class="hidden mt-2 flex items-center gap-3 p-3 rounded-xl bg-[#140707] border border-imperial-gold/20">
                  <img id="dishImagePreview" src="" alt="Preview" class="w-16 h-16 object-cover rounded-lg border border-imperial-gold/30 shrink-0" />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-serif text-imperial-gold font-semibold">Vista previa</p>
                    <p id="dishImagePreviewError" class="hidden text-xs text-red-400 mt-0.5">No se pudo cargar la imagen. Verifica la URL.</p>
                  </div>
                  <button type="button" id="btnClearImage" title="Quitar imagen" class="text-imperial-muted hover:text-red-400 transition-colors shrink-0 ml-2">
                    <i class="fa-solid fa-xmark text-sm"></i>
                  </button>
                </div>
              </div>
            </div>`;

if (c.includes(old)) {
    c = c.replace(old, newBlock);
    fs.writeFileSync('index.html', c, 'utf8');
    console.log('OK: Campo de imagen actualizado con preview');
} else {
    console.log('ERROR: texto exacto no encontrado');
}
