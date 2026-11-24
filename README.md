# Mis Links — Linktree personal en GitHub Pages

Réplica de [linktr.ee/david.chings](https://linktr.ee/david.chings) (mismos enlaces, iconos, tema "Air" y diseño de tarjeta) con su propio **panel de gestión** en `/admin`, sin dependencias ni paso de compilación.

## Estructura

```
index.html            Página pública (lee data/profile.json)
data/profile.json     ÚNICA fuente de datos: perfil, redes, links, tema y ajustes
assets/css/page.css   Estilos de la página pública
assets/js/shared.js   Catálogos (redes, temas, fuentes) y aplicación del tema
assets/js/page.js     Render, compartir, QR, contenido sensible, programación, analíticas
assets/img/           Avatar y miniaturas originales
assets/uploads/       Imágenes subidas desde el panel
admin/                Panel de gestión (index.html, admin.css, admin.js)
```

## Funcionalidades

**Página pública** (igual que Linktree)
- Avatar, nombre, bio e iconos sociales (arriba o abajo).
- Links *clásicos* (miniatura a la izquierda) y *destacados* (imagen grande 16:9).
- Menú ⋮ por link y botón de compartir del perfil: copiar, QR, WhatsApp, X, Facebook, LinkedIn, Telegram, email y compartir nativo.
- En escritorio, tarjeta centrada sobre fondo oscurecido y QR "Ver en el móvil".
- Encabezados de sección, animaciones (vibrar, tambalear, pulso, deslizar, brillo), aviso de contenido sensible y links programados por fecha.

**Panel `/admin`**
- **Links:** agregar, editar en línea, activar/desactivar, arrastrar para reordenar (o con flechas), duplicar, eliminar, diseño clásico/destacado, miniatura (subir imagen, URL, emoji o icono), programar, animación y contenido sensible.
- **Apariencia:** 10 temas, fondo (color, degradado o imagen), estilo de botón (relleno, contorno, sombra suave, sombra marcada), esquinas, colores y tipografía (Google Fonts).
- **Perfil:** foto (se redimensiona en el navegador), forma y tamaño, nombre, bio, monograma e iconos sociales.
- **Analíticas:** integración con GoatCounter (visitas y clics por link, sin cookies).
- **Ajustes:** SEO/Open Graph, elementos visibles, pie de página, exportar/importar JSON, descartar borrador y **publicar a GitHub**.
- **Vista previa en vivo** en un móvil simulado. Los cambios se guardan como borrador en el navegador hasta que pulsas **Publicar**.

## Publicar desde el panel

1. Crea un token *fine-grained* en <https://github.com/settings/personal-access-tokens/new>:
   - *Repository access:* solo este repositorio.
   - *Permissions → Contents:* **Read and write**.
2. Abre `https://<usuario>.github.io/<repo>/admin/` → **Ajustes → Publicación en GitHub**, completa usuario, repo, rama (`main`) y token, y pulsa *Guardar y probar conexión*.
3. Edita lo que quieras y pulsa **Publicar**. Se crea **un solo commit** con `data/profile.json`, las imágenes nuevas (`assets/uploads/`) y las meta tags regeneradas en `index.html`. GitHub Pages lo despliega en ~1 minuto.

> El token se guarda solo en el `localStorage` de tu navegador. El panel es público (es un sitio estático), pero sin token nadie puede publicar cambios.

## Desarrollo local

```bash
python -m http.server 8000
# Página: http://localhost:8000/   Panel: http://localhost:8000/admin/
```

Desde el panel local también puedes publicar (usa la API de GitHub), o editar `data/profile.json` a mano y hacer `git push`.

## Activar GitHub Pages

Repositorio → **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
Si el repositorio se llama `<usuario>.github.io`, el sitio queda en la raíz del dominio.
