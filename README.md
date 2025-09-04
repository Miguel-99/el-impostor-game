# 🎭 El Impostor

Un juego multijugador web donde los jugadores deben identificar al impostor entre ellos.

## 🎮 Cómo Jugar

1. **Unirse al juego**: Los jugadores ingresan sus nombres para unirse
2. **Agregar palabras**: Cada jugador agrega una palabra secreta
3. **Iniciar partida**: El host inicia el juego
4. **Descubrir roles**: Los jugadores consultan si son el impostor o tienen una palabra
5. **Jugar**: El impostor debe pasar desapercibido mientras los demás intentan identificarlo

## 🚀 Instalación y Uso

### Prerrequisitos
- Node.js 14.0.0 o superior
- npm

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/el-impostor.git
cd el-impostor

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

### Desarrollo
```bash
# Iniciar en modo desarrollo (con auto-reload)
npm run dev
```

## 🌐 Acceso

- **Jugadores**: http://localhost:3000
- **Host**: http://localhost:3000/host.html

## 🔧 API Endpoints

### Jugadores
- `POST /join` - Unirse al juego
- `POST /add-word` - Agregar palabra
- `GET /state/:name` - Consultar rol del jugador

### Gestión del Juego
- `GET /players` - Listar jugadores
- `POST /start` - Iniciar partida
- `GET /status` - Estado del juego

### Administración
- `POST /reset` - Reiniciar juego completo
- `POST /reset-words` - Reiniciar solo palabras