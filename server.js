const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
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

  removePlayer(name) {
    if (!name) return;
    const trimmedName = name.trim();
    const index = this.players.findIndex(p => p.name === trimmedName);
    if (index !== -1) {
      const removedPlayer = this.players.splice(index, 1)[0];
      // If the player who left had a word, remove it from the words list
      if (removedPlayer.word) {
        const wordIndex = this.words.indexOf(removedPlayer.word);
        if (wordIndex !== -1) {
          this.words.splice(wordIndex, 1);
        }
      }
      return true;
    }
    return false;
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

// WebSocket Logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (name, callback) => {
    try {
      const newPlayer = gameState.addPlayer(name);
      io.emit("playersUpdated", gameState.getPlayers());
      callback({ success: true, player: newPlayer });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on("leave", (name, callback) => {
    try {
      const removed = gameState.removePlayer(name);
      if (removed) {
        io.emit("playersUpdated", gameState.getPlayers());
        console.log(`Player ${name} left the game`);
      }
      if (callback) callback({ success: true });
    } catch (error) {
      if (callback) callback({ success: false, error: error.message });
    }
  });

  socket.on("addWord", ({ name, word }, callback) => {
    try {
      const result = gameState.addWord(name, word);
      io.emit("playersUpdated", gameState.getPlayers());
      callback({ success: true, word: result.word });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on("getPlayers", (callback) => {
    callback(gameState.getPlayers());
  });

  socket.on("startGame", (callback) => {
    try {
      const result = gameState.startGame();
      const { impostorName, ...clientResult } = result;
      io.emit("gameStarted", clientResult);
      callback({ success: true, result: clientResult });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on("resetGame", (callback) => {
    gameState.reset();
    io.emit("gameReset", { message: "Juego reseteado completamente" });
    io.emit("playersUpdated", []);
    if (callback) callback({ success: true });
  });

  socket.on("resetWords", (callback) => {
    gameState.removeWords();
    io.emit("gameReset", { message: "Palabras eliminadas y juego reiniciado" });
    io.emit("playersUpdated", gameState.getPlayers());
    if (callback) callback({ success: true });
  });

  socket.on("getPlayerState", (name, callback) => {
    try {
      const state = gameState.getPlayerState(name);
      callback({ success: true, state });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on("getGameStatus", (callback) => {
    callback({
      started: gameState.started,
      playerCount: gameState.players.length,
      wordsCount: gameState.words.length,
      hasCommonWord: !!gameState.commonWord,
      starterPlayer: gameState.starterPlayer
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Routes (keeping HTTP as fallback/legacy)
app.get("/status", (req, res) => {
  res.json({
    started: gameState.started,
    playerCount: gameState.players.length,
    wordsCount: gameState.words.length,
    hasCommonWord: !!gameState.commonWord,
    starterPlayer: gameState.starterPlayer
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎮 Servidor El Impostor ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Archivos estáticos servidos desde: ${path.join(__dirname, 'public')}`);
});

module.exports = server;