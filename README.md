Proyecto: Lista de Series

Estructura actual (organizada):

- index.html                - Página principal (HTML)
- css/styles.css            - Estilos CSS principales
- js/script.js              - JavaScript (manejo de la lista, localStorage)
- assets/images/            - Carpeta para imágenes locales (usa URL relativas aquí)
- assets/icons/             - Carpeta para iconos locales o sprites
- data/                     - Lugar para archivos JSON o datos extra
- backup/index.orig.html    - Copia de seguridad de index.html antes de cambios
- backup/styles.orig.css    - Copia de seguridad del CSS original

Cómo usar
1. Añade imágenes locales dentro de `assets/images/` y en el formulario, usa la ruta relativa como `assets/images/miPortada.jpg`.
2. Export / Import:
	- Editar y Export / Import:
	- Usa el botón "Exportar JSON" para descargar la lista actual como `mediaList.json`.
	- Para importar una lista, selecciona un archivo JSON válido con el selector y presiona "Importar". Puedes elegir si reemplazar la lista actual o fusionarla.
 
	Además:
	- Edición en sitio: ahora puedes editar un elemento seleccionando "Editar" — el formulario se rellenará y la actualización sucederá en su lugar (se mantiene el mismo id).
	- Confirmación al eliminar: eliminar requiere confirmación para evitar borrados accidentales.

Si quieres que mueva también las imágenes de ejemplo o que convierta las rutas por defecto para imágenes locales, dímelo y lo hago.
2. Si quieres personalizar estilos, edita `css/styles.css`.
3. Si necesitas cambiar la lógica, edita `js/script.js`.

Si quieres que mueva también las imágenes de ejemplo o que convierta las rutas por defecto para imágenes locales, dímelo y lo hago.