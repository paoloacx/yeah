# Yeah¡ - Check-in App

Aplicación de check-in para registrar todos los lugares donde has estado.

## Desarrollo Web

La aplicación web está en la carpeta raíz. Puedes abrir `index.html` directamente en el navegador o usar un servidor local.

## Desarrollo Android con Capacitor

### Requisitos previos
- Node.js y npm instalados
- Android Studio instalado
- Java JDK 17 o superior

### Instalación

```bash
# Instalar dependencias
npm install

# Sincronizar código web con Android
npm run capacitor:sync
```

### Build y ejecución en Android

```bash
# Abrir proyecto en Android Studio
npm run capacitor:open:android

# O directamente
npx cap open android
```

Desde Android Studio:
1. Conecta un dispositivo Android o inicia un emulador
2. Click en "Run" (▶️) para instalar y ejecutar la app

### Actualizar cambios

Después de modificar archivos en `www/`:

```bash
# Sincronizar cambios
npx cap sync

# O solo Android
npx cap sync android
```

### Estructura del proyecto

```
/
├── www/              # Código web de la aplicación
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── icons/
├── android/          # Proyecto nativo Android (generado)
├── capacitor.config.json
└── package.json
```

## Permisos de Android

La app requiere los siguientes permisos:
- **Ubicación** (ACCESS_FINE_LOCATION): Para obtener coordenadas GPS
- **Cámara** (CAMERA): Para tomar fotos de los lugares
- **Almacenamiento** (READ/WRITE_EXTERNAL_STORAGE): Para guardar fotos

## Plugins de Capacitor usados

- `@capacitor/camera` - Acceso a la cámara nativa
- `@capacitor/geolocation` - Geolocalización precisa
- `@capacitor/preferences` - Almacenamiento persistente
- `@capacitor/splash-screen` - Pantalla de carga
- `@capacitor/status-bar` - Control de la barra de estado

## Widgets de Android

La app incluye 3 widgets para la pantalla de inicio:

### 1. Check-in rápido (1x1)
- Botón que abre la app directamente en la card de nuevo check-in
- Ideal para hacer check-ins rápidos sin navegar por la app

### 2. Mapa miniatura (2x2)
- Muestra una vista previa del mapa con tus lugares
- Contador de check-ins totales
- Al pulsar, abre la app en la pantalla principal

### 3. Top 3 lugares (2x1)
- Lista de tus 3 lugares más visitados con contadores
- Se actualiza automáticamente cada 30 minutos
- Al pulsar cualquier lugar, abre la app

Los widgets se actualizan automáticamente cuando:
- Guardas un nuevo check-in
- Eliminas un check-in
- Modificas tus lugares favoritos
