## finapartner-cdn

Pequeño repo de scripts JavaScript con minificación automatizada usando Husky (pre-commit) y Terser. La salida minificada se escribe en `dist/`.

Carpeta objetivo (target) por defecto: `src/`.

### Requisitos
- Node.js 18+ y npm
- Git (para hooks de Husky)

### Instalación
1) Instalar dependencias:

```bash
npm install
```

2) Instalar hooks de Husky:

```bash
npm run prepare
```

> Nota: `prepare` ejecuta `husky install` y deja activos los hooks en `.husky/`.

### Flujo automático (Husky)
- Al hacer commit, Husky detecta los archivos `.js` modificados dentro de `scripts/` o `src/` (excluye `*.min.js`), los minifica con Terser y agrega los resultados en `dist/` al mismo commit.
- No necesitas correr comandos manuales para minificar en el día a día.

### Uso manual (opcional)
- Minificar todos los `.js` en `src/`:

```bash
npm run minify:all
```

- Minificar solo archivos específicos o un directorio:

```bash
# Directorio (por defecto usa src/ si no pasas nada)
npm run minify -- src

# Archivos específicos
npm run minify -- src/meta.js src/gtm.js
```

### Salida
- Los minificados se generan en `dist/` con sufijo `.min.js`, por ejemplo:
  - `src/meta.js` -> `dist/meta.min.js`
  - `src/gtm.js` -> `dist/gtm.min.js`

### Personalización de Terser (opcional)
Si necesitas preservar comentarios de licencia o evitar renombrar ciertos identificadores:
- Preservar licencias:

```bash
# Ejemplo de flags adicionales (ajustar en scripts/minify-all.js o scripts/minify-files.js: TERSER_OPTS)
terser --compress --mangle --comments=/@license|@preserve|^!/ ...
```

- Evitar renombrar nombres específicos:

```bash
terser --compress --mangle reserved=['NombreQueNoManglear'] ...
```


### Problemas comunes
- Los hooks no corren tras clonar:
  - Ejecuta `npm install` y luego `npm run prepare`.
- Permiso denegado al ejecutar scripts:
  - Asegúrate de que los scripts tengan permiso de ejecución:

```bash
chmod +x .husky/pre-commit scripts/minify-files.js scripts/minify-all.js
```