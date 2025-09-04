// Shared Game Client Library
class GameClient {
  constructor() {
    this.playerName = this.getStoredPlayerName();
  }

  // Local Storage Management
  getStoredPlayerName() {
    return localStorage.getItem("playerName") || "";
  }

  setStoredPlayerName(name) {
    localStorage.setItem("playerName", name);
    this.playerName = name;
  }

  // API Calls
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async joinGame(name) {
    if (!name || name.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    const trimmedName = name.trim();
    const data = await this.makeRequest('/join', {
      method: 'POST',
      body: JSON.stringify({ name: trimmedName })
    });

    this.setStoredPlayerName(trimmedName);
    return data;
  }

  async addWord(name, word) {
    if (!name || !word || name.trim() === '' || word.trim() === '') {
      throw new Error('Nombre y palabra son requeridos');
    }

    return await this.makeRequest('/add-word', {
      method: 'POST',
      body: JSON.stringify({ 
        name: name.trim(), 
        word: word.trim() 
      })
    });
  }

  async getPlayers() {
    return await this.makeRequest('/players');
  }

  async startGame() {
    return await this.makeRequest('/start', {
      method: 'POST'
    });
  }

  async getPlayerState(name) {
    if (!name || name.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    return await this.makeRequest(`/state/${encodeURIComponent(name.trim())}`);
  }

  async resetGame() {
    return await this.makeRequest('/reset', {
      method: 'POST'
    });
  }

  async resetWords() {
    return await this.makeRequest('/reset-words', {
      method: 'POST'
    });
  }

  async getGameStatus() {
    return await this.makeRequest('/status');
  }

  // UI Helpers
  showMessage(message, type = 'info') {
    // Try to use a custom message display if available
    if (window.showCustomMessage) {
      window.showCustomMessage(message, type);
      return;
    }

    // Fallback to alert
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
    if (!form) {
      console.warn(`Form with id '${formId}' not found`);
      return;
    }

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
    if (!button) {
      console.warn(`Button with id '${buttonId}' not found`);
      return;
    }

    button.addEventListener('click', async (e) => {
      try {
        // Disable button during operation
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
    
    const result = await this.joinGame(name);
    this.showSuccess(`Te uniste al juego como: ${result.name}`);
    
    // Update name field if it changed (trimmed)
    const nameInput = form.querySelector('#name');
    if (nameInput) {
      nameInput.value = result.name;
    }
  }

  async handleWordForm(e, form) {
    const formData = new FormData(form);
    const name = formData.get('name') || this.playerName;
    const word = formData.get('word');
    
    if (!name) {
      throw new Error('Debes unirte al juego primero');
    }

    const result = await this.addWord(name, word);
    this.showSuccess(`Palabra "${result.word}" agregada correctamente`);
    
    // Clear word input
    const wordInput = form.querySelector('#word');
    if (wordInput) {
      wordInput.value = '';
    }
  }

  async handleRoleCheck() {
    let name = this.playerName;
    
    if (!name) {
      name = prompt("Ingrese el nombre del jugador:");
      if (!name) return;
    }

    const playerState = await this.getPlayerState(name);
    
    if (playerState.role === 'impostor') {
      this.showMessage("🎭 Eres el IMPOSTOR", 'warning');
    } else {
      this.showMessage(`📝 Tu palabra es: "${playerState.word}"`, 'info');
    }
  }

  // Initialize common functionality
  initializeCommonFeatures() {
    // Load saved name on page load
    window.addEventListener("DOMContentLoaded", () => {
      const nameInput = document.getElementById("name");
      if (nameInput && this.playerName) {
        nameInput.value = this.playerName;
      }
    });

    // Setup common forms
    this.setupForm('joinForm', this.handleJoinForm.bind(this));
    this.setupForm('wordForm', this.handleWordForm.bind(this));
    this.setupButton('role', this.handleRoleCheck.bind(this));
  }
}

// Create global instance
window.gameClient = new GameClient();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.gameClient.initializeCommonFeatures();
  });
} else {
  window.gameClient.initializeCommonFeatures();
}