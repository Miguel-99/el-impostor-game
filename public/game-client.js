// Shared Game Client Library
class GameClient {
  constructor() {
    this.playerName = this.getStoredPlayerName();
    this.socket = io();
    this.setupSocketListeners();
  }

  // Local Storage Management
  getStoredPlayerName() {
    return localStorage.getItem("playerName") || "";
  }

  setStoredPlayerName(name) {
    localStorage.setItem("playerName", name);
    this.playerName = name;
  }

  // Socket Logic
  setupSocketListeners() {
    this.socket.on("playersUpdated", (players) => {
      // Dispatch custom event for UI to react
      window.dispatchEvent(new CustomEvent("game:playersUpdated", { detail: players }));
    });

    this.socket.on("gameStarted", (result) => {
      window.dispatchEvent(new CustomEvent("game:started", { detail: result }));
      this.showSuccess(`🎉 ${result.message}`);
    });

    this.socket.on("gameReset", (data) => {
      window.dispatchEvent(new CustomEvent("game:reset", { detail: data }));
      this.showSuccess(`🔄 ${data.message}`);
    });
  }

  // WebSocket Wrapper for Promises
  emitAsync(event, data) {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (response) => {
        if (response && response.success === false) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // API Methods (now using Sockets)
  async joinGame(name) {
    if (!name || name.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    const trimmedName = name.trim();
    const response = await this.emitAsync('join', trimmedName);
    this.setStoredPlayerName(trimmedName);
    return response.player;
  }

  async addWord(name, word) {
    if (!name || !word || name.trim() === '' || word.trim() === '') {
      throw new Error('Nombre y palabra son requeridos');
    }

    const response = await this.emitAsync('addWord', {
      name: name.trim(),
      word: word.trim()
    });
    return response;
  }

  async getPlayers() {
    return new Promise((resolve) => {
      this.socket.emit('getPlayers', resolve);
    });
  }

  async startGame() {
    const response = await this.emitAsync('startGame');
    return response.result;
  }

  async getPlayerState(name) {
    if (!name || name.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    const response = await this.emitAsync('getPlayerState', name.trim());
    return response.state;
  }

  async resetGame() {
    return await this.emitAsync('resetGame');
  }

  async resetWords() {
    return await this.emitAsync('resetWords');
  }

  async getGameStatus() {
    return new Promise((resolve) => {
      this.socket.emit('getGameStatus', resolve);
    });
  }

  // UI Helpers
  showMessage(message, type = 'info') {
    if (window.showCustomMessage) {
      window.showCustomMessage(message, type);
      return;
    }
    alert(message);
  }

  showError(error) {
    const message = error.message || error.toString();
    console.error('Game Error:', message);
    this.showMessage(`Error: ${message}`, 'error');
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  // Form Helpers
  setupForm(formId, handler) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await handler(e, form);
      } catch (error) {
        this.showError(error);
      }
    });
  }

  setupButton(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener('click', async (e) => {
      try {
        button.disabled = true;
        await handler(e, button);
      } catch (error) {
        this.showError(error);
      } finally {
        button.disabled = false;
      }
    });
  }

  // Common form handlers
  async handleJoinForm(e, form) {
    const formData = new FormData(form);
    const name = formData.get('name');
    const player = await this.joinGame(name);
    this.showSuccess(`Te uniste como: ${player.name}`);

    const nameInput = form.querySelector('#name');
    if (nameInput) nameInput.value = player.name;
  }

  async handleWordForm(e, form) {
    const formData = new FormData(form);
    const name = formData.get('name') || this.playerName;
    const word = formData.get('word');

    if (!name) throw new Error('Debes unirte al juego primero');

    const result = await this.addWord(name, word);
    this.showSuccess(`Palabra "${result.word}" agregada`);

    const wordInput = form.querySelector('#word');
    if (wordInput) wordInput.value = '';
  }

  async handleRoleCheck() {
    let name = this.playerName;
    if (!name) {
      name = prompt("Ingrese el nombre del jugador:");
      if (!name) return;
    }

    try {
      const playerState = await this.getPlayerState(name);
      if (playerState.role === 'impostor') {
        this.showMessage("🎭 Eres el IMPOSTOR", 'warning');
      } else {
        this.showMessage(`📝 Tu palabra es: "${playerState.word}"`, 'info');
      }
    } catch (error) {
      this.showError(error);
    }
  }

  // Initialize common functionality
  initializeCommonFeatures() {
    window.addEventListener("DOMContentLoaded", () => {
      const nameInput = document.getElementById("name");
      if (nameInput && this.playerName) {
        nameInput.value = this.playerName;
      }
    });

    this.setupForm('joinForm', this.handleJoinForm.bind(this));
    this.setupForm('wordForm', this.handleWordForm.bind(this));
    this.setupButton('role', this.handleRoleCheck.bind(this));
  }
}

// Create global instance
window.gameClient = new GameClient();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.gameClient.initializeCommonFeatures();
  });
} else {
  window.gameClient.initializeCommonFeatures();
}