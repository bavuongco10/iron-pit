import * as THREE from 'three';
import { Arena } from './arena.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { ProjectileManager } from './projectiles.js';
import { HUD } from './hud.js';
import { DIFFICULTIES } from './difficulties.js';
import { sounds } from './audio.js';

window.THREE = THREE;

class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.state = 'menu'; // 'menu', 'playing', 'paused', 'gameover'
    this.selectedDifficulty = DIFFICULTIES.medium;
    this.matchTime = 0;

    // Match statistics
    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      matchTime: 0,
      difficultyName: this.selectedDifficulty.name,
      difficultyColor: this.selectedDifficulty.color
    };

    this.initThree();
    this.initGameObjects();
    this.initHUD();
    this.setupEventListeners();

    // Expose for automated browser testing and inspection
    window.game = this;

    // Clock
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initGameObjects() {
    this.arena = new Arena(this.scene);
    this.projectiles = new ProjectileManager(this.scene, this.arena);
    this.player = new Player(this.camera, this.arena, this.renderer.domElement);
    this.enemy = new Enemy(this.scene, this.arena, this.selectedDifficulty);
  }

  initHUD() {
    this.hud = new HUD(
      DIFFICULTIES,
      (diffKey) => this.setDifficulty(diffKey),
      () => this.restartGame()
    );
    this.hud.setDifficultyBadge(this.selectedDifficulty);
  }

  setDifficulty(diffKey) {
    if (DIFFICULTIES[diffKey]) {
      this.selectedDifficulty = DIFFICULTIES[diffKey];
      this.hud.setDifficultyBadge(this.selectedDifficulty);
      if (this.enemy) {
        this.enemy.reset(this.selectedDifficulty);
      }
    }
  }

  startGame() {
    sounds.init();
    const menuModal = document.getElementById('menu-modal');
    if (menuModal) menuModal.classList.remove('visible');

    this.state = 'playing';
    this.matchTime = 0;
    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      matchTime: 0,
      difficultyName: this.selectedDifficulty.name,
      difficultyColor: this.selectedDifficulty.color
    };

    this.player.reset();
    this.enemy.reset(this.selectedDifficulty);
    this.projectiles.clear();
    this.hud.hideEndGameModal();
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.classList.add('visible');
    this.populatePauseDifficultyList();
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.classList.remove('visible');
  }

  restartGame() {
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.classList.remove('visible');
    this.startGame();
  }

  populatePauseDifficultyList() {
    const list = document.getElementById('pause-difficulty-list');
    if (!list) return;

    list.innerHTML = '';
    Object.keys(DIFFICULTIES).forEach((key) => {
      const diff = DIFFICULTIES[key];
      const isSel = this.selectedDifficulty.id === key;
      const card = document.createElement('div');
      card.className = `diff-card ${isSel ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="diff-header">
          <span class="diff-title" style="color: ${diff.color}">${diff.name}</span>
          <span class="diff-badge" style="border-color: ${diff.color}; color: ${diff.color}">${diff.badge}</span>
        </div>
        <p class="diff-desc">${diff.description}</p>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('#pause-difficulty-list .diff-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.setDifficulty(key);
      });
      list.appendChild(card);
    });
  }

  setupEventListeners() {
    // Start game button
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', () => this.startGame());
    }

    // Resume button
    const btnResume = document.getElementById('btn-resume-game');
    if (btnResume) {
      btnResume.addEventListener('click', () => this.resumeGame());
    }

    // Restart button
    const btnRestart = document.getElementById('btn-restart-game');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => this.restartGame());
    }

    // Play again button
    const btnPlayAgain = document.getElementById('btn-play-again');
    if (btnPlayAgain) {
      btnPlayAgain.addEventListener('click', () => this.restartGame());
    }

    // Change difficulty button
    const btnChangeDiff = document.getElementById('btn-change-difficulty');
    if (btnChangeDiff) {
      btnChangeDiff.addEventListener('click', () => {
        this.hud.hideEndGameModal();
        const menuModal = document.getElementById('menu-modal');
        if (menuModal) menuModal.classList.add('visible');
        this.state = 'menu';
      });
    }

    // Pause menu button in HUD
    const btnPauseMenu = document.getElementById('btn-pause-menu');
    if (btnPauseMenu) {
      btnPauseMenu.addEventListener('click', () => {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
      });
    }

    // Sound toggle button
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const enabled = sounds.toggleMute();
        btnAudio.textContent = enabled ? '🔊' : '🔇';
      });
    }

    // Keybindings: Esc to pause
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'playing') {
          this.pauseGame();
        } else if (this.state === 'paused') {
          this.resumeGame();
        }
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === 'playing') {
      this.matchTime += delta;
      this.stats.matchTime = this.matchTime;

      // Update Arena animations (dust particles)
      this.arena.update(delta);

      // Update Player
      this.player.update(delta, (projectileData) => {
        this.projectiles.spawn(projectileData);
        this.stats.shotsFired++;
      });

      // Update Enemy
      this.enemy.update(delta, this.player.position, (projectileData) => {
        this.projectiles.spawn(projectileData);
      });

      // Update Projectiles & Hit Detection
      this.projectiles.update(
        delta,
        this.player,
        this.enemy,
        (damage) => {
          // Player hit enemy
          this.stats.shotsHit++;
          this.stats.damageDealt += damage;
          this.hud.showHitmarker();
        },
        () => {
          // Enemy hit player
          this.hud.showDamageFlash();
        }
      );

      // Check Victory / Defeat conditions
      if (this.enemy.isDead && this.state === 'playing') {
        this.state = 'gameover';
        sounds.playVictory();
        setTimeout(() => {
          this.hud.showEndGameModal(true, this.stats);
        }, 1200);
      } else if (this.player.isDead && this.state === 'playing') {
        this.state = 'gameover';
        setTimeout(() => {
          this.hud.showEndGameModal(false, this.stats);
        }, 1000);
      }
    }

    // Update HUD display
    this.hud.update(delta, this.player, this.enemy, this.matchTime);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Start game instance on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
