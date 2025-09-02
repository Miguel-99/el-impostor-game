const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;

// Estado en memoria

let gameState = {
  players: [],
  commonWord: null,
  starterPlayer: null,
  impostorName: null,
  words: [],
  started: false
};

// Middleware
app.use(bodyParser.json());
app.use(express.static("public")); // sirve los HTML

// Registrar jugador
app.post("/join", (req, res) => {
  console.log("req.body: ", req.body)
  const { name } = req.body;
  console.log("Nuevo jugador:", req.body);
  if (!name) {
    return res.status(400).json({ error: "Nombre y palabra requeridos" });
  }

  if (gameState.players.some(player => player.name === name)) {
    return res.status(400).json({ error: "Ya existe un usuario en partida con ese nombre" });
  }

  const newPlayer = {
    id: gameState.players.length + 1,
    name
  };
  gameState.players.push(newPlayer);

  res.json(newPlayer);
});

app.post("/add-word", (req, res) => {
  const { name, word } = req.body;
  if (!word || !name) {
    return res.status(400).json({ error: "Palabra y nombre requeridos" });
  }

  gameState.words.push(word);
  gameState.players.find(p => p.name === name).word = word;

  res.json({ word });
});

// Listar jugadores
app.get("/players", (req, res) => {
  res.json(gameState.players);
});

// Iniciar partida
app.post("/start", (req, res) => {

  const randomIndex = Math.floor(Math.random() * gameState.players.length);
  const commonWord = gameState.players[randomIndex].word;

  const starterPlayerIndex = Math.floor(Math.random() * gameState.players.length)
  const starterPlayer = gameState.players[starterPlayerIndex].name;

  const impostorIndex = Math.floor(Math.random() * gameState.players.length)
  const impostorName = gameState.players[impostorIndex].name;

  gameState.commonWord = commonWord;
  gameState.started = true;
  gameState.impostorName = impostorName;

  res.json({
    message: "Partida iniciada",
    starterPlayer,
    commonWord
  });
});

app.get("/state/:name", (req, res) => {
  if (!gameState.started) {
    return res.status(400).json({ error: "La partida aún no empezó" });
  }

  const playerName = req.params.name;
  const player = gameState.players.find(p => p.name === playerName);

  if (!player) {
    return res.status(404).json({ error: "Jugador no encontrado" });
  }

  if (player.name === gameState.impostorName) {
    return res.json({ role: "impostor" });
  } else {
    return res.json({ role: "player", word: gameState.commonWord });
  }
});

// Reiniciar partida
app.get("/remove-players", (req, res) => {
  gameState = {
    players: [],
    commonWord: null,
    starterPlayer: null,
    impostorName: null,
    words: [],
    started: false
  };

  res.json({ message: "Juego reseteado" });
});

app.get("/remove-words", (req, res) => {
  gameState.commonWord = null;
  gameState.starterPlayer = null;
  gameState.impostorName = null;
  gameState.words = [];
  gameState.started = false;

  gameState.players.forEach(p => p.word = null);

  res.json({ message: "Palabras eliminadas y juego reiniciado" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});