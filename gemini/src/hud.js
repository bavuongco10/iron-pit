export class HUD {
  constructor(difficulties, onSelectDifficulty, onRestart) {
    this.difficulties = difficulties;
    this.onSelectDifficulty = onSelectDifficulty;
    this.onRestart = onRestart;

    this.hitmarkerTimer = 0;
    this.damageFlashTimer = 0;

    // Cache DOM elements
    this.hpBar = document.getElementById('hud-hp-bar');
    this.hpText = document.getElementById('hud-hp-text');
    this.shieldBar = document.getElementById('hud-shield-bar');
    this.shieldText = document.getElementById('hud-shield-text');
    
    this.enemyBossBar = document.getElementById('enemy-hp-bar');
    this.enemyHpText = document.getElementById('enemy-hp-text');
    this.enemyBadge = document.getElementById('enemy-difficulty-badge');

    this.ammoText = document.getElementById('hud-ammo-text');
    this.reloadBar = document.getElementById('hud-reload-bar');
    this.reloadContainer = document.getElementById('hud-reload-container');

    this.crosshair = document.getElementById('hud-crosshair');
    this.hitmarker = document.getElementById('hud-hitmarker');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.lowHpWarning = document.getElementById('low-hp-warning');

    // Radar canvas
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;
    this.radarDistText = document.getElementById('radar-dist-text');

    // Match Timer
    this.matchTimerText = document.getElementById('hud-timer-text');

    // Setup difficulty buttons and modals
    this.setupDifficultyUI();
  }

  setupDifficultyUI() {
    const listContainer = document.getElementById('difficulty-options-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    Object.keys(this.difficulties).forEach((key) => {
      const diff = this.difficulties[key];
      const card = document.createElement('div');
      card.className = `diff-card ${key === 'medium' ? 'selected' : ''}`;
      card.id = `diff-card-${key}`;
      card.dataset.diff = key;

      card.innerHTML = `
        <div class="diff-header">
          <span class="diff-title" style="color: ${diff.color}">${diff.name}</span>
          <span class="diff-badge" style="border-color: ${diff.color}; color: ${diff.color}">${diff.badge}</span>
        </div>
        <p class="diff-desc">${diff.description}</p>
        <div class="diff-stats-grid">
          <div class="diff-stat-item">
            <span class="stat-label">Health</span>
            <span class="stat-val">${diff.stats.health}</span>
          </div>
          <div class="diff-stat-item">
            <span class="stat-label">Speed</span>
            <span class="stat-val">${diff.stats.speed}</span>
          </div>
          <div class="diff-stat-item">
            <span class="stat-label">Accuracy</span>
            <span class="stat-val">${diff.stats.accuracy}</span>
          </div>
          <div class="diff-stat-item">
            <span class="stat-label">Fire Rate</span>
            <span class="stat-val">${diff.stats.fireRate}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedDifficultyKey = key;
        if (this.onSelectDifficulty) {
          this.onSelectDifficulty(key);
        }
      });

      listContainer.appendChild(card);
    });
  }

  setDifficultyBadge(diffConfig) {
    if (this.enemyBadge) {
      this.enemyBadge.textContent = diffConfig.badge;
      this.enemyBadge.style.borderColor = diffConfig.color;
      this.enemyBadge.style.color = diffConfig.color;
    }
    const currentDiffTag = document.getElementById('current-difficulty-tag');
    if (currentDiffTag) {
      currentDiffTag.textContent = diffConfig.name.toUpperCase();
      currentDiffTag.style.color = diffConfig.color;
    }
  }

  showHitmarker() {
    this.hitmarkerTimer = 0.18;
    if (this.hitmarker) {
      this.hitmarker.classList.add('active');
    }
  }

  showDamageFlash() {
    this.damageFlashTimer = 0.25;
    if (this.damageOverlay) {
      this.damageOverlay.style.opacity = '1';
    }
  }

  update(delta, player, enemy, matchTime) {
    // 1. Player HP & Shield
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    const shieldPct = Math.max(0, (player.shield / player.maxShield) * 100);

    if (this.hpBar) this.hpBar.style.width = `${hpPct}%`;
    if (this.hpText) this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    if (this.shieldBar) this.shieldBar.style.width = `${shieldPct}%`;
    if (this.shieldText) this.shieldText.textContent = `${Math.ceil(player.shield)} / ${player.maxShield}`;

    // Low HP alert
    if (this.lowHpWarning) {
      if (player.hp > 0 && player.hp <= 30) {
        this.lowHpWarning.classList.add('visible');
      } else {
        this.lowHpWarning.classList.remove('visible');
      }
    }

    // 2. Enemy Boss Bar
    const enemyHpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    if (this.enemyBossBar) this.enemyBossBar.style.width = `${enemyHpPct}%`;
    if (this.enemyHpText) this.enemyHpText.textContent = `${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP`;

    // 3. Ammo & Reload
    if (this.ammoText) {
      if (player.isReloading) {
        this.ammoText.textContent = `RELOADING...`;
        this.ammoText.classList.add('reloading');
      } else {
        this.ammoText.textContent = `${player.ammo} / ${player.maxAmmo}`;
        this.ammoText.classList.remove('reloading');
      }
    }

    if (this.reloadContainer && this.reloadBar) {
      if (player.isReloading) {
        this.reloadContainer.style.display = 'block';
        this.reloadBar.style.width = `${Math.min(100, player.reloadProgress * 100)}%`;
      } else {
        this.reloadContainer.style.display = 'none';
      }
    }

    // 4. Hitmarker timeout
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= delta;
      if (this.hitmarkerTimer <= 0 && this.hitmarker) {
        this.hitmarker.classList.remove('active');
      }
    }

    // 5. Damage overlay fade
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      if (this.damageOverlay) {
        this.damageOverlay.style.opacity = `${Math.max(0, this.damageFlashTimer / 0.25)}`;
      }
    }

    // 6. Match Timer
    if (this.matchTimerText && matchTime !== undefined) {
      const mins = Math.floor(matchTime / 60);
      const secs = Math.floor(matchTime % 60);
      this.matchTimerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 7. Radar Render
    this.renderRadar(player, enemy);
  }

  renderRadar(player, enemy) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 4;
    const arenaRadius = 32; // Half arena size

    ctx.clearRect(0, 0, w, h);

    // Radar background circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Range rings
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // Map world coords (relative to player)
    // Radar orientation: Up is player forward look direction
    const playerAngle = player.yaw;

    // Enemy position relative to player
    if (!enemy.isDead) {
      const relX = enemy.mesh.position.x - player.position.x;
      const relZ = enemy.mesh.position.z - player.position.z;
      const dist = Math.sqrt(relX * relX + relZ * relZ);

      // Rotate by player yaw so top is always player's facing direction
      const rotX = relX * Math.cos(playerAngle) - relZ * Math.sin(playerAngle);
      const rotZ = relX * Math.sin(playerAngle) + relZ * Math.cos(playerAngle);

      // Scale to radar radius
      const scale = radius / arenaRadius;
      const radarX = cx + rotX * scale;
      const radarY = cy + rotZ * scale;

      // Draw enemy blip
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(radarX, radarY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (this.radarDistText) {
        this.radarDistText.textContent = `${dist.toFixed(1)}m`;
      }
    } else {
      if (this.radarDistText) {
        this.radarDistText.textContent = `TARGET DOWN`;
      }
    }

    // Player blip in center (cyan triangle pointing UP)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Outer border
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  showEndGameModal(isVictory, stats) {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;

    const title = document.getElementById('modal-title');
    const subtitle = document.getElementById('modal-subtitle');
    const statsContainer = document.getElementById('modal-stats');

    if (isVictory) {
      title.textContent = 'VICTORY ACHIEVED';
      title.className = 'modal-title victory';
      subtitle.textContent = `The cyber opponent has been neutralized on ${stats.difficultyName} difficulty.`;
    } else {
      title.textContent = 'MISSION FAILED';
      title.className = 'modal-title defeat';
      subtitle.textContent = `You were defeated in combat. Recalibrate tactics and try again.`;
    }

    const accuracy = stats.shotsFired > 0 ? ((stats.shotsHit / stats.shotsFired) * 100).toFixed(1) : 0;
    const mins = Math.floor(stats.matchTime / 60);
    const secs = Math.floor(stats.matchTime % 60);

    statsContainer.innerHTML = `
      <div class="modal-stat-card">
        <span class="label">Difficulty</span>
        <span class="value" style="color: ${stats.difficultyColor}">${stats.difficultyName}</span>
      </div>
      <div class="modal-stat-card">
        <span class="label">Time Survived</span>
        <span class="value">${mins}m ${secs}s</span>
      </div>
      <div class="modal-stat-card">
        <span class="label">Damage Dealt</span>
        <span class="value">${stats.damageDealt} HP</span>
      </div>
      <div class="modal-stat-card">
        <span class="label">Accuracy</span>
        <span class="value">${accuracy}%</span>
      </div>
      <div class="modal-stat-card">
        <span class="label">Shots Fired / Hits</span>
        <span class="value">${stats.shotsFired} / ${stats.shotsHit}</span>
      </div>
    `;

    modal.classList.add('visible');
  }

  hideEndGameModal() {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.classList.remove('visible');
  }
}
