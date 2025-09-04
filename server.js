const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Game State Management
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.players = [];
    this.commonWord = null;
    this.starterPlayer = null;
    this.impostorName = null;
    this.words = [];
    this.started = false;
  }

  addPlayer(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Nombre inválido');
    }

    const trimmedName = name.trim();
    if (this.players.some(player => player.name === trimmedName)) {
      throw new Error('Ya existe un usuario en partida con ese nombre');
    }

    const newPlayer = {
      id: this.players.length + 1,
      name: trimmedName,
      word: null
    };
    
    this.players.push(newPlayer);
    return newPlayer;
  }

  addWord(name, word) {
    if (!name || !word || typeof name !== 'string' || typeof word !== 'string') {
      throw new Error('Nombre y palabra son requeridos');
    }

    const trimmedName = name.trim();
    const trimmedWord = word.trim();
    
    if (trimmedWord === '') {
      throw new Error('La palabra no puede estar vacía');
    }

    const player = this.players.find(p => p.name === trimmedName);
    if (!player) {
      throw new Error('Jugador no encontrado');
    }

    if (player.word) {
      throw new Error('El jugador ya tiene una palabra asignada');
    }

    this.words.push(trimmedWord);
    player.word = trimmedWord;
    
    return { word: trimmedWord };
  }

  startGame() {
    if (this.players.length < 2) {
      throw new Error('Se necesitan al menos 2 jugadores para iniciar');
    }

    const playersWithWords = this.players.filter(p => p.word);
    if (playersWithWords.length === 0) {
      throw new Error('Se necesita al menos una palabra para iniciar');
    }

    if (this.started) {
      throw new Error('La partida ya ha comenzado');
    }

    // Seleccionar palabra común de las palabras disponibles
    const randomWordIndex = Math.floor(Math.random() * playersWithWords.length);
    this.commonWord = playersWithWords[randomWordIndex].word;

    // Seleccionar jugador que inicia
    const starterPlayerIndex = Math.floor(Math.random() * this.players.length);
    this.starterPlayer = this.players[starterPlayerIndex].name;

    // Seleccionar impostor
    const impostorIndex = Math.floor(Math.random() * this.players.length);
    this.impostorName = this.players[impostorIndex].name;

    this.started = true;

    return {
      message: "Partida iniciada",
      starterPlayer: this.starterPlayer,
      commonWord: this.commonWord,
      totalPlayers: this.players.length,
      impostorName: this.impostorName // Solo para debugging, no enviar al cliente
    };
  }

  getPlayerState(name) {
    if (!this.started) {
      throw new Error('La partida aún no ha comenzado');
    }

    const trimmedName = name.trim();
    const player = this.players.find(p => p.name === trimmedName);
    
    if (!player) {
      throw new Error('Jugador no encontrado');
    }

    if (player.name === this.impostorName) {
      return { role: "impostor", name: player.name };
    } else {
      return { role: "player", word: this.commonWord, name: player.name };
    }
  }

  removeWords() {
    this.commonWord = null;
    this.starterPlayer = null;
    this.impostorName = null;
    this.words = [];
    this.started = false;
    this.players.forEach(p => p.word = null);
  }

  getPlayers() {
    return this.players.map(player => ({
      id: player.id,
      name: player.name,
      hasWord: !!player.word
    }));
  }
}

// Initialize game state
const gameState = new GameState();

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ 
    error: err.message || 'Error interno del servidor' 
  });
};

// Routes
app.post("/join", asyncHandler(async (req, res) => {
  const { name } = req.body;
  const newPlayer = gameState.addPlayer(name);
  res.json(newPlayer);
}));

app.post("/add-word", asyncHandler(async (req, res) => {
  const { name, word } = req.body;
  const result = gameState.addWord(name, word);
  res.json(result);
}));

app.get("/players", (req, res) => {
  res.json(gameState.getPlayers());
});

app.post("/start", asyncHandler(async (req, res) => {
  const result = gameState.startGame();
  // No enviar el nombre del impostor al cliente
  const { impostorName, ...clientResult } = result;
  res.json(clientResult);
}));

app.get("/state/:name", asyncHandler(async (req, res) => {
  const playerName = req.params.name;
  const playerState = gameState.getPlayerState(playerName);
  res.json(playerState);
}));

app.post("/reset", (req, res) => {
  gameState.reset();
  res.json({ message: "Juego reseteado completamente" });
});

app.post("/reset-words", (req, res) => {
  gameState.removeWords();
  res.json({ message: "Palabras eliminadas y juego reiniciado" });
});

// Legacy endpoints (mantener compatibilidad)
app.get("/remove-players", (req, res) => {
  gameState.reset();
  res.json({ message: "Juego reseteado" });
});

app.get("/remove-words", (req, res) => {
  gameState.removeWords();
  res.json({ message: "Palabras eliminadas y juego reiniciado" });
});

// Game status endpoint
app.get("/status", (req, res) => {
  res.json({
    started: gameState.started,
    playerCount: gameState.players.length,
    wordsCount: gameState.words.length,
    hasCommonWord: !!gameState.commonWord,
    starterPlayer: gameState.starterPlayer
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Servidor El Impostor ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Archivos estáticos servidos desde: ${path.join(__dirname, 'public')}`);
});

module.exports = app; // Para testing