/**
 * game.js - Game State Manager, Keyboard Input Router, level db, and main game loop.
 */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    
    // Core Modules
    this.assets = new GameAssets();
    this.particles = new ParticleSystem();

    // Game state data
    this.state = "MENU"; // MENU, MAP, PLAYING, PAUSED, UPGRADE, GAMEOVER, VICTORY
    this.saveKey = "fightInShadesSaveV2";
    this.currentLevel = 1;
    this.unlockedLevels = 1;
    this.completedLevels = [];
    this.score = 0;
    this.gold = 0;
    this.maxCombo = 0;
    this.roundScore = 0;
    this.roundGold = 0;
    
    // Player Stats Configuration (Persistent upgrades)
    this.playerStats = this.createDefaultStats();

    // Entities
    this.player = null;
    this.opponent = null;
    this.floatingText = []; // Float text array: {x, y, text, color, life, maxLife}

    // Battle metrics
    this.battleTimer = 99;
    this.timerInterval = null;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.hitStopFrames = 0;
    this.feedbackCooldown = 0;
    this.impactFlash = { life: 0, maxLife: 0, color: "#ffffff" };
    this.time = 0; // global frames ticker for animated assets

    // Input States
    this.keys = {};

    // 10 Level database config
    this.levelDatabase = {
      1: { name: "The Recruit", weapon: "fists", archetype: "Balanced", maxHp: 85, color: "#111116", eyeColor: "#ffa200", blockRate: 0.12, speed: 0.75, decisionInterval: 45, lightRate: 0.55, heavyRate: 0.18, specialRate: 0.04 },
      2: { name: "Shadow Bandit", weapon: "fists", archetype: "Brawler", maxHp: 100, color: "#0d0d12", eyeColor: "#ff5e00", blockRate: 0.22, speed: 0.85, decisionInterval: 35, lightRate: 0.62, heavyRate: 0.18, retreatRate: 0.08 },
      3: { name: "Shield Guard", weapon: "katana", archetype: "Defender", maxHp: 120, color: "#080b10", eyeColor: "#00d4ff", blockRate: 0.65, speed: 0.70, decisionInterval: 30, lightRate: 0.28, heavyRate: 0.32, retreatRate: 0.05 },
      4: { name: "Blade Acolyte", weapon: "katana", archetype: "Duelist", maxHp: 130, color: "#0b0810", eyeColor: "#b200ff", blockRate: 0.38, speed: 1.00, decisionInterval: 24, lightRate: 0.42, heavyRate: 0.30, specialRate: 0.12 },
      5: { name: "The Wind Monk", weapon: "katana", archetype: "Counter", maxHp: 140, color: "#08100d", eyeColor: "#00ffb7", blockRate: 0.48, speed: 1.15, decisionInterval: 18, dodgeRate: 0.36, lightRate: 0.46, heavyRate: 0.20, retreatRate: 0.18 },
      6: { name: "The Fire Fist", weapon: "claws", archetype: "Pressure", maxHp: 155, color: "#150808", eyeColor: "#ff003c", blockRate: 0.32, speed: 1.10, decisionInterval: 16, lightRate: 0.68, heavyRate: 0.16, specialRate: 0.16 },
      7: { name: "Spear Master", weapon: "spear", archetype: "Zoner", maxHp: 170, color: "#0f1015", eyeColor: "#22ff00", blockRate: 0.45, speed: 0.90, decisionInterval: 22, preferredRange: 135, retreatRange: 78, retreatRate: 0.36, lightRate: 0.34, heavyRate: 0.34 },
      8: { name: "Shadow Assassin", weapon: "claws", archetype: "Assassin", maxHp: 190, color: "#08050e", eyeColor: "#ff00bf", blockRate: 0.52, speed: 1.25, decisionInterval: 14, dodgeRate: 0.42, lightRate: 0.64, heavyRate: 0.12, specialRate: 0.18, retreatRate: 0.20 },
      9: { name: "Demon Warrior", weapon: "shadow_blade", archetype: "Bruiser", maxHp: 230, color: "#05020c", eyeColor: "#7e00ff", blockRate: 0.40, speed: 1.05, decisionInterval: 18, lightRate: 0.30, heavyRate: 0.42, specialRate: 0.16 },
      10: { name: "Shadow Overlord", weapon: "shadow_blade", archetype: "Final Boss", maxHp: 320, color: "#020005", eyeColor: "#ff0055", blockRate: 0.70, speed: 1.20, decisionInterval: 11, dodgeRate: 0.40, lightRate: 0.36, heavyRate: 0.34, specialRate: 0.22, retreatRate: 0.14 }
    };

    this.loadProgress();

    // Binding event listeners
    this.setupEventListeners();

    // Start rendering loops
    this.lastFrameTime = performance.now();
    this.tick();
  }

  setupEventListeners() {
    // Keyboard inputs
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;

      if ([" ", "arrowup", "arrowleft", "arrowright", "shift"].includes(key)) {
        e.preventDefault();
      }

      if ((key === "escape" || key === "p") && !e.repeat) {
        this.togglePause();
        return;
      }
      
      // Perform one-off actions on press down (avoid continuous repeat)
      if (this.state === "PLAYING" && this.player && !this.player.isDead && !e.repeat) {
        if (key === "w" || key === "arrowup") {
          this.handlePlayerAction(this.player.jump());
        }
        if (key === "j" || key === "z") {
          this.handlePlayerAction(this.player.attackLight(this.opponent));
        }
        if (key === "k" || key === "x") {
          this.handlePlayerAction(this.player.attackHeavy(this.opponent));
        }
        if (key === "l" || key === "c") {
          this.handlePlayerAction(this.player.attackSpecial(this.opponent));
        }
        if (key === " " || key === "q") {
          this.handlePlayerAction(this.player.dodge(this.getPlayerMoveDirection()));
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = false;

      // Stop blocking if block key is released
      if (this.state === "PLAYING" && this.player && (key === "i" || key === "shift")) {
        this.player.block(false);
      }
    });

    // Screen Buttons Click Events
    document.getElementById("btn-start").addEventListener("click", () => this.switchState("MAP"));
    document.getElementById("btn-instructions").addEventListener("click", () => this.switchState("INSTRUCTIONS"));
    document.getElementById("btn-back-to-menu").addEventListener("click", () => this.switchState("MENU"));
    document.getElementById("btn-claim-rewards").addEventListener("click", () => {
      this.switchState("UPGRADE");
    });
    document.getElementById("btn-upgrade-done").addEventListener("click", () => this.switchState("MAP"));
    document.getElementById("btn-retry").addEventListener("click", () => this.startDuel(this.currentLevel));
    document.getElementById("btn-gameover-map").addEventListener("click", () => this.switchState("MAP"));
    document.getElementById("btn-fight").addEventListener("click", () => this.startDuel(this.currentLevel));
    document.getElementById("btn-pause").addEventListener("click", () => this.togglePause());
    document.getElementById("btn-resume").addEventListener("click", () => this.togglePause());
    document.getElementById("btn-pause-map").addEventListener("click", () => this.switchState("MAP"));
    document.getElementById("btn-reset-progress").addEventListener("click", () => this.resetProgress());

    // Stat Upgrade Buttons
    const upgradeBtns = document.querySelectorAll(".btn-upgrade");
    upgradeBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const stat = e.target.getAttribute("data-stat");
        this.applyUpgrade(stat);
      });
    });

    this.setupTouchControls();
  }

  createDefaultStats() {
    return {
      speedMult: 1.0,
      damageMult: 1.0,
      energyRecovery: 1.0,
      maxHpBonus: 0,
      hpLevel: 0,
      atkLevel: 0,
      spdLevel: 0,
      engLevel: 0
    };
  }

  loadProgress() {
    try {
      const rawSave = localStorage.getItem(this.saveKey);
      if (!rawSave) return;

      const save = JSON.parse(rawSave);
      this.unlockedLevels = Math.min(10, Math.max(1, Number(save.unlockedLevels) || 1));
      this.currentLevel = Math.min(this.unlockedLevels, Math.max(1, Number(save.currentLevel) || 1));
      this.completedLevels = Array.isArray(save.completedLevels)
        ? save.completedLevels.filter(level => Number.isInteger(level) && level >= 1 && level <= 10)
        : [];
      this.score = Math.max(0, Number(save.score) || 0);
      this.gold = Math.max(0, Number(save.gold) || 0);
      this.playerStats = { ...this.createDefaultStats(), ...(save.playerStats || {}) };
    } catch (error) {
      console.warn("Unable to load saved progress", error);
    }
  }

  saveProgress() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify({
        currentLevel: this.currentLevel,
        unlockedLevels: this.unlockedLevels,
        completedLevels: this.completedLevels,
        score: this.score,
        gold: this.gold,
        playerStats: this.playerStats
      }));
    } catch (error) {
      console.warn("Unable to save progress", error);
    }
  }

  resetProgress() {
    const confirmed = window.confirm("Reset campaign progress, score, gold, and upgrades?");
    if (!confirmed) return;

    localStorage.removeItem(this.saveKey);
    this.currentLevel = 1;
    this.unlockedLevels = 1;
    this.completedLevels = [];
    this.score = 0;
    this.gold = 0;
    this.playerStats = this.createDefaultStats();
    this.switchState("MAP");
  }

  setupTouchControls() {
    document.querySelectorAll("[data-control]").forEach(btn => {
      const control = btn.getAttribute("data-control");
      const start = (event) => {
        event.preventDefault();
        btn.classList.add("pressed");
        this.handleTouchControl(control, true);
      };
      const end = (event) => {
        event.preventDefault();
        btn.classList.remove("pressed");
        this.handleTouchControl(control, false);
      };

      btn.addEventListener("pointerdown", start);
      btn.addEventListener("pointerup", end);
      btn.addEventListener("pointercancel", end);
      btn.addEventListener("pointerleave", end);
    });
  }

  handleTouchControl(control, active) {
    if (control === "left") this.keys.arrowleft = active;
    if (control === "right") this.keys.arrowright = active;

    if (!active && control === "block" && this.player) {
      this.player.block(false);
      return;
    }

    if (!active || this.state !== "PLAYING" || !this.player || this.player.isDead) return;

    if (control === "jump") this.handlePlayerAction(this.player.jump());
    if (control === "dodge") this.handlePlayerAction(this.player.dodge(this.getPlayerMoveDirection()));
    if (control === "light") this.handlePlayerAction(this.player.attackLight(this.opponent));
    if (control === "heavy") this.handlePlayerAction(this.player.attackHeavy(this.opponent));
    if (control === "special") this.handlePlayerAction(this.player.attackSpecial(this.opponent));
    if (control === "block") this.handlePlayerAction(this.player.block(true));
  }

  handlePlayerAction(success) {
    if (success || !this.player || this.feedbackCooldown > 0) return;
    if (this.player.actionDeniedReason === "stamina") {
      this.spawnStatusText(this.player.x + this.player.width / 2, this.player.y, "LOW STAMINA", "#ffa200");
      this.feedbackCooldown = 45;
    }
  }

  getPlayerMoveDirection() {
    if (this.keys["a"] || this.keys["arrowleft"]) return -1;
    if (this.keys["d"] || this.keys["arrowright"]) return 1;
    return 0;
  }

  togglePause() {
    if (this.state === "PLAYING") {
      this.switchState("PAUSED");
    } else if (this.state === "PAUSED") {
      this.switchState("PLAYING");
    }
  }

  switchState(newState) {
    this.state = newState;

    // Hide all UI overlays first
    const overlays = ["start-screen", "instructions-screen", "map-screen", "upgrade-screen", "victory-screen", "gameover-screen", "pause-screen", "hud-overlay"];
    overlays.forEach(id => {
      document.getElementById(id).classList.add("hidden");
      document.getElementById(id).classList.remove("active");
    });

    // Handle screen entries logic
    if (newState === "MENU") {
      document.getElementById("start-screen").classList.add("active");
      document.getElementById("start-screen").classList.remove("hidden");
    } else if (newState === "INSTRUCTIONS") {
      document.getElementById("instructions-screen").classList.add("active");
      document.getElementById("instructions-screen").classList.remove("hidden");
    } else if (newState === "MAP") {
      this.renderLevelMap();
      document.getElementById("map-score").innerText = this.score;
      document.getElementById("map-gold").innerText = this.gold;
      document.getElementById("map-screen").classList.add("active");
      document.getElementById("map-screen").classList.remove("hidden");
    } else if (newState === "UPGRADE") {
      this.updateUpgradeScreen();
      document.getElementById("upgrade-screen").classList.add("active");
      document.getElementById("upgrade-screen").classList.remove("hidden");
    } else if (newState === "VICTORY") {
      document.getElementById("victory-screen").classList.add("active");
      document.getElementById("victory-screen").classList.remove("hidden");
    } else if (newState === "GAMEOVER") {
      document.getElementById("gameover-screen").classList.add("active");
      document.getElementById("gameover-screen").classList.remove("hidden");
    } else if (newState === "PLAYING") {
      document.getElementById("hud-overlay").classList.add("active");
      document.getElementById("hud-overlay").classList.remove("hidden");
    } else if (newState === "PAUSED") {
      document.getElementById("hud-overlay").classList.add("active");
      document.getElementById("hud-overlay").classList.remove("hidden");
      document.getElementById("pause-screen").classList.add("active");
      document.getElementById("pause-screen").classList.remove("hidden");
    }
  }

  renderLevelMap() {
    const container = document.getElementById("levels-container");
    container.innerHTML = ""; // Clear existing

    // Show Fight Button if a node is selected
    const fightBtn = document.getElementById("btn-fight");
    fightBtn.classList.remove("hidden");

    for (let l = 1; l <= 10; l++) {
      const cfg = this.levelDatabase[l];
      const node = document.createElement("div");
      node.className = "level-node";
      
      if (this.completedLevels.includes(l)) {
        node.classList.add("completed");
      } else if (l <= this.unlockedLevels) {
        node.classList.add("active");
      } else {
        node.classList.add("locked");
      }

      if (this.currentLevel === l && l <= this.unlockedLevels) {
        node.classList.add("selected");
      }

      node.innerHTML = `
        <div class="level-num">${l}</div>
        <div class="level-info">
          <span class="level-name">${cfg.name}</span>
          <span class="level-style">${cfg.archetype} - ${cfg.weapon.replace("_", " ")}</span>
          <span class="level-status">${
            this.completedLevels.includes(l) ? "DEFEATED" : (l <= this.unlockedLevels ? "CHALLENGE" : "LOCKED")
          }</span>
        </div>
      `;

      if (l <= this.unlockedLevels) {
        node.addEventListener("click", () => {
          // Select this level
          this.currentLevel = l;
          this.saveProgress();
          // Redraw map to show selection border
          this.renderLevelMap();
        });
      }

      container.appendChild(node);
    }
  }

  updateUpgradeScreen() {
    document.getElementById("upgrade-gold").innerText = this.gold;
    
    // Update levels text
    document.getElementById("stat-lvl-hp").innerText = this.playerStats.hpLevel;
    document.getElementById("stat-lvl-atk").innerText = this.playerStats.atkLevel;
    document.getElementById("stat-lvl-spd").innerText = this.playerStats.spdLevel;
    document.getElementById("stat-lvl-eng").innerText = this.playerStats.engLevel;

    // Calculate dynamic costs
    const hpCost = 100 + this.playerStats.hpLevel * 50;
    const atkCost = 100 + this.playerStats.atkLevel * 50;
    const spdCost = 100 + this.playerStats.spdLevel * 50;
    const engCost = 100 + this.playerStats.engLevel * 50;

    // Update button text
    document.getElementById("btn-up-hp").innerText = `+ ${hpCost}g`;
    document.getElementById("btn-up-atk").innerText = `+ ${atkCost}g`;
    document.getElementById("btn-up-spd").innerText = `+ ${spdCost}g`;
    document.getElementById("btn-up-eng").innerText = `+ ${engCost}g`;

    // Enable/disable buttons based on affordable gold limits
    document.getElementById("btn-up-hp").disabled = this.gold < hpCost;
    document.getElementById("btn-up-atk").disabled = this.gold < atkCost;
    document.getElementById("btn-up-spd").disabled = this.gold < spdCost;
    document.getElementById("btn-up-eng").disabled = this.gold < engCost;
  }

  applyUpgrade(stat) {
    let cost = 100;
    if (stat === "hp") {
      cost = 100 + this.playerStats.hpLevel * 50;
      if (this.gold < cost) return;
      this.gold -= cost;
      this.playerStats.hpLevel++;
      this.playerStats.maxHpBonus += 25;
    } else if (stat === "atk") {
      cost = 100 + this.playerStats.atkLevel * 50;
      if (this.gold < cost) return;
      this.gold -= cost;
      this.playerStats.atkLevel++;
      this.playerStats.damageMult += 0.15;
    } else if (stat === "spd") {
      cost = 100 + this.playerStats.spdLevel * 50;
      if (this.gold < cost) return;
      this.gold -= cost;
      this.playerStats.spdLevel++;
      this.playerStats.speedMult += 0.08;
    } else if (stat === "eng") {
      cost = 100 + this.playerStats.engLevel * 50;
      if (this.gold < cost) return;
      this.gold -= cost;
      this.playerStats.engLevel++;
      this.playerStats.energyRecovery += 0.25;
    }

    this.updateUpgradeScreen();
    this.saveProgress();
  }

  startDuel(levelNum) {
    this.currentLevel = levelNum;
    const cfg = this.levelDatabase[levelNum];

    // Clear previous elements
    this.particles.clear();
    this.floatingText = [];
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.roundScore = 0;
    this.roundGold = 0;

    // Reset battle clock
    this.battleTimer = 99;
    document.getElementById("hud-timer").innerText = this.battleTimer;
    clearInterval(this.timerInterval);

    // Initialize Fighters
    // Player is on left facing right, Katana weapon
    this.player = new Fighter({
      x: 180,
      y: 300,
      color: "#0a0a0f",
      eyeColor: "#00f2fe",
      isPlayer: true,
      name: "SHADOW",
      maxHp: 100,
      weaponType: "katana", // Player wields katana
      stats: this.playerStats
    });
    this.player.particles = this.particles;

    // Scale stats based on level difficulty (enemies become stronger)
    let difficultyMultiplier = 1.0 + (levelNum - 1) * 0.15; // 15% HP scaling per level
    let finalMaxHp = Math.round(cfg.maxHp * difficultyMultiplier);
    let finalDmgMult = 1.0 + (levelNum - 1) * 0.10; // 10% damage scaling per level

    // Enemy is on right facing left
    this.opponent = new Fighter({
      x: 780,
      y: 300,
      color: cfg.color,
      eyeColor: cfg.eyeColor,
      isPlayer: false,
      name: cfg.name.toUpperCase(),
      maxHp: finalMaxHp,
      weaponType: cfg.weapon,
      damageMult: finalDmgMult,
      aiConfig: {
        blockRate: Math.min(0.9, cfg.blockRate * (1.0 + (levelNum - 1) * 0.05)),
        decisionInterval: Math.max(8, Math.round(cfg.decisionInterval * (1.0 - (levelNum - 1) * 0.03))),
        speed: cfg.speed * (1.0 + (levelNum - 1) * 0.02),
        dodgeRate: cfg.dodgeRate ?? Math.min(0.38, 0.12 + levelNum * 0.02),
        preferredRange: cfg.preferredRange || null,
        retreatRange: cfg.retreatRange || 55,
        retreatRate: cfg.retreatRate || 0,
        lightRate: cfg.lightRate,
        heavyRate: cfg.heavyRate,
        specialRate: cfg.specialRate
      }
    });
    // Adjust opponent speed multiplier based on configuration
    this.opponent.speedMult = cfg.speed * (1.0 + (levelNum - 1) * 0.02);
    this.opponent.particles = this.particles;

    // Update HUD static info
    document.getElementById("hud-player-name").innerText = this.player.name;
    document.getElementById("hud-enemy-name").innerText = this.opponent.name;
    document.getElementById("hud-level-title").innerText = `LEVEL ${levelNum} - ${cfg.archetype.toUpperCase()}`;

    this.switchState("PLAYING");

    // Display FIGHT announcer overlay
    const fightAnnouncer = document.getElementById("fight-announcement");
    fightAnnouncer.innerText = cfg.archetype.toUpperCase();
    fightAnnouncer.classList.add("show");
    
    // Screenshake for entrance feel
    this.particles.shake(5, 15);

    setTimeout(() => {
      fightAnnouncer.innerText = "FIGHT!";
      
      // Start clock countdown
      this.timerInterval = setInterval(() => {
        if (this.state === "PLAYING" && !this.player.isDead && !this.opponent.isDead) {
          this.battleTimer--;
          document.getElementById("hud-timer").innerText = this.battleTimer;
          
          if (this.battleTimer <= 0) {
            this.handleTimeout();
          }
        }
      }, 1000);

      setTimeout(() => {
        fightAnnouncer.classList.remove("show");
      }, 1000);
    }, 1500);
  }

  handleTimeout() {
    clearInterval(this.timerInterval);
    const fightAnnouncer = document.getElementById("fight-announcement");
    fightAnnouncer.innerText = "TIME'S UP!";
    fightAnnouncer.classList.add("show");

    // Determine winner based on HP percentage
    let pPct = this.player.hp / this.player.maxHp;
    let oPct = this.opponent.hp / this.opponent.maxHp;

    setTimeout(() => {
      fightAnnouncer.classList.remove("show");
      if (pPct >= oPct) {
        this.handleBattleWin();
      } else {
        this.handleBattleLose();
      }
    }, 2000);
  }

  spawnDamageNumber(x, y, amount, isCrit = false) {
    this.floatingText.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y - 20,
      text: Math.round(amount),
      color: isCrit ? "#ffdd66" : "#ffffff",
      size: isCrit ? 26 : 17,
      life: isCrit ? 48 : 38,
      maxLife: isCrit ? 48 : 38
    });
  }

  spawnStatusText(x, y, text, color = "#ffa200") {
    this.floatingText.push({
      x,
      y: y - 28,
      text,
      color,
      size: 14,
      life: 42,
      maxLife: 42
    });
  }

  triggerHitStop(type) {
    const frames = type === "light" ? 4 : (type === "heavy" ? 10 : 7);
    this.hitStopFrames = Math.max(this.hitStopFrames, frames);
  }

  triggerImpactFlash(type, blocked = false) {
    if (blocked) {
      this.impactFlash = { life: 5, maxLife: 5, color: "rgba(0, 242, 254, 0.18)" };
      return;
    }
    if (type === "heavy") {
      this.impactFlash = { life: 8, maxLife: 8, color: "rgba(255, 221, 102, 0.28)" };
    } else if (type === "special") {
      this.impactFlash = { life: 7, maxLife: 7, color: "rgba(157, 78, 221, 0.28)" };
    } else {
      this.impactFlash = { life: 4, maxLife: 4, color: "rgba(255, 255, 255, 0.16)" };
    }
  }

  triggerCombo() {
    this.comboCount++;
    this.comboTimer = 90; // combo window is 1.5 seconds at 60fps
    
    const comboCont = document.getElementById("combo-container");
    const comboCountEl = document.getElementById("combo-count");
    
    comboCountEl.innerText = this.comboCount;
    comboCont.classList.remove("hidden");
    
    // Animate combo scale briefly
    comboCountEl.style.transform = "scale(1.2)";
    setTimeout(() => {
      comboCountEl.style.transform = "scale(1)";
    }, 120);
  }

  /**
   * Monitor fighter damage events dynamically
   */
  interceptCombatHits() {
    // We override takeDamage method of fighters to hook numbers and combo counts
    const engine = this;

    if (this.player && !this.player.hasHooks) {
      const origTakeDamage = this.player.takeDamage;
      this.player.takeDamage = function(amount, direction, type, particles) {
        origTakeDamage.call(this, amount, direction, type, particles);
        engine.triggerHitStop(type);
        if (this.lastHitDodged) {
          engine.spawnStatusText(this.x + this.width/2, this.y, "DODGED", this.eyeColor);
          return;
        }
        if (this.lastHitBlocked && this.guardBreakTimer > 0) {
          engine.spawnStatusText(this.x + this.width/2, this.y, "GUARD BREAK", "#ffa200");
        }
        engine.triggerImpactFlash(type, this.lastHitBlocked);
        engine.spawnDamageNumber(this.x + this.width/2, this.y, this.lastDamageTaken || amount, type === "heavy" || type === "special");

        if (!this.lastHitBlocked) {
          engine.comboCount = 0;
          document.getElementById("combo-container").classList.add("hidden");
        }

        if (this.isDead) {
          engine.handleBattleLose();
        }
      };
      this.player.hasHooks = true;
    }

    if (this.opponent && !this.opponent.hasHooks) {
      const origTakeDamage = this.opponent.takeDamage;
      this.opponent.takeDamage = function(amount, direction, type, particles) {
        origTakeDamage.call(this, amount, direction, type, particles);
        engine.triggerHitStop(type);
        if (this.lastHitDodged) {
          engine.spawnStatusText(this.x + this.width/2, this.y, "DODGED", this.eyeColor);
          return;
        }
        if (this.lastHitBlocked && this.guardBreakTimer > 0) {
          engine.spawnStatusText(this.x + this.width/2, this.y, "GUARD BREAK", "#ffa200");
        }
        engine.triggerImpactFlash(type, this.lastHitBlocked);
        engine.spawnDamageNumber(this.x + this.width/2, this.y, this.lastDamageTaken || amount, type === "heavy" || type === "special");

        if (!this.lastHitBlocked) {
          engine.triggerCombo();
        }

        // Award Gold and Score dynamically on hits
        let baseScore = 10;
        let baseGold = 1;
        if (type === "heavy") {
          baseScore = 25;
          baseGold = 3;
        } else if (type === "special") {
          baseScore = 15;
          baseGold = 2;
        }
        if (this.lastHitBlocked) {
          baseScore = 4;
          baseGold = 0;
        }

        let comboMultiplier = Math.max(1, Math.floor(engine.comboCount / 3));
        let earnedScore = baseScore * comboMultiplier;
        let earnedGold = baseGold * comboMultiplier;

        engine.score += earnedScore;
        engine.roundScore += earnedScore;
        engine.gold += earnedGold;
        engine.roundGold += earnedGold;

        if (engine.comboCount > engine.maxCombo) {
          engine.maxCombo = engine.comboCount;
        }

        if (this.isDead) {
          engine.handleBattleWin();
        }
      };
      this.opponent.hasHooks = true;
    }
  }

  handleBattleWin() {
    clearInterval(this.timerInterval);
    
    // Announcer K.O.
    const fightAnnouncer = document.getElementById("fight-announcement");
    fightAnnouncer.innerText = "K.O.";
    fightAnnouncer.classList.add("show");

    // Calculate victory bonuses
    const victoryBonusScore = 1000 + this.battleTimer * 10;
    const victoryBonusGold = 150 + Math.floor(this.battleTimer * 1.5) + this.maxCombo * 5;

    this.score += victoryBonusScore;
    this.roundScore += victoryBonusScore;
    this.gold += victoryBonusGold;
    this.roundGold += victoryBonusGold;

    setTimeout(() => {
      fightAnnouncer.innerText = "VICTORY";
      
      setTimeout(() => {
        fightAnnouncer.classList.remove("show");
        
        // Save progression
        if (!this.completedLevels.includes(this.currentLevel)) {
          this.completedLevels.push(this.currentLevel);
        }
        // Unlock next level
        if (this.currentLevel === this.unlockedLevels && this.unlockedLevels < 10) {
          this.unlockedLevels++;
        }
        this.saveProgress();

        // Show updated metrics on victory screen
        document.getElementById("victory-round-score").innerText = this.roundScore;
        document.getElementById("victory-round-gold").innerText = `+${this.roundGold}`;
        document.getElementById("victory-total-gold").innerText = this.gold;

        this.switchState("VICTORY");
      }, 1500);
    }, 1500);
  }

  handleBattleLose() {
    clearInterval(this.timerInterval);
    
    // Announcer DEFEAT
    const fightAnnouncer = document.getElementById("fight-announcement");
    fightAnnouncer.innerText = "DEFEATED";
    fightAnnouncer.classList.add("show");

    setTimeout(() => {
      fightAnnouncer.classList.remove("show");
      document.getElementById("gameover-score").innerText = this.score;
      this.saveProgress();
      this.switchState("GAMEOVER");
    }, 2000);
  }

  processKeyboardInputs() {
    if (this.state !== "PLAYING" || !this.player || this.player.isDead) return;

    // Movement left/right
    if (this.keys["a"] || this.keys["arrowleft"]) {
      this.player.move(-1);
    } else if (this.keys["d"] || this.keys["arrowright"]) {
      this.player.move(1);
    } else {
      this.player.stopMove();
    }

    // Defensive Block holding
    if (this.keys["i"] || this.keys["shift"]) {
      this.player.block(true);
    }
  }

  updateHUD() {
    if ((this.state !== "PLAYING" && this.state !== "PAUSED") || !this.player || !this.opponent) return;

    // Health percentages
    const pHealthPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
    const oHealthPct = Math.max(0, (this.opponent.hp / this.opponent.maxHp) * 100);
    const pEnergyPct = Math.max(0, (this.player.energy / this.player.maxEnergy) * 100);
    const pStaminaPct = Math.max(0, (this.player.stamina / this.player.maxStamina) * 100);
    const oStaminaPct = Math.max(0, (this.opponent.stamina / this.opponent.maxStamina) * 100);

    document.getElementById("player-health").style.width = `${pHealthPct}%`;
    document.getElementById("enemy-health").style.width = `${oHealthPct}%`;
    document.getElementById("player-energy").style.width = `${pEnergyPct}%`;
    document.getElementById("player-stamina").style.width = `${pStaminaPct}%`;
    document.getElementById("enemy-stamina").style.width = `${oStaminaPct}%`;

    // Dynamic HUD Score and Gold values
    document.getElementById("hud-score").innerText = this.score;
    document.getElementById("hud-gold").innerText = this.gold;

    // Special skill status indicators (glowing active state)
    const specialKey = document.querySelector("#controls-hint .control-special");
    if (specialKey) {
      if (this.player.energy >= 50 && this.player.specialCooldown <= 0) {
        specialKey.style.color = "var(--purple-glow)";
        specialKey.style.textShadow = "0 0 8px var(--purple-glow)";
      } else {
        specialKey.style.color = "";
        specialKey.style.textShadow = "";
      }
    }
  }

  updateFloatingTexts() {
    for (let i = this.floatingText.length - 1; i >= 0; i--) {
      let ft = this.floatingText[i];
      ft.life--;
      ft.y -= 0.8; // drift upwards
      
      if (ft.life <= 0) {
        this.floatingText.splice(i, 1);
      }
    }
  }

  drawFloatingTexts() {
    this.ctx.save();
    this.floatingText.forEach(ft => {
      let alpha = ft.life / ft.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = `black ${ft.size}px 'Orbitron'`;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = ft.color;
      this.ctx.textAlign = "center";
      this.ctx.fillText(typeof ft.text === "number" ? Math.round(ft.text) : ft.text, ft.x, ft.y);
    });
    this.ctx.restore();
  }

  drawImpactFlash() {
    if (this.impactFlash.life <= 0) return;

    const alpha = this.impactFlash.life / this.impactFlash.maxLife;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = this.impactFlash.color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.impactFlash.life--;
  }

  /**
   * The core 60fps ticker loop
   */
  tick() {
    this.time++;
    if (this.feedbackCooldown > 0) this.feedbackCooldown--;

    // Calculate delta time if we need frames cap, but simple tick is enough for standard Canvas
    if (this.state === "PLAYING" && this.hitStopFrames <= 0) {
      this.processKeyboardInputs();
    }

    // Combat damage listeners verification
    this.interceptCombatHits();

    // Combo timer decrement
    if (this.state === "PLAYING" && this.hitStopFrames <= 0 && this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        document.getElementById("combo-container").classList.add("hidden");
      }
    }

    // UPDATE ENTITIES
    if (this.state === "PLAYING" && this.hitStopFrames <= 0) {
      if (this.player) this.player.update(this.canvas.width, this.canvas.height, this.opponent);
      if (this.opponent) this.opponent.update(this.canvas.width, this.canvas.height, this.player);
      this.updateFloatingTexts();
      this.updateHUD();
    } else if (this.state === "PLAYING" && this.hitStopFrames > 0) {
      this.hitStopFrames--;
      this.updateHUD();
    } else if (this.state === "PAUSED") {
      this.updateHUD();
    }

    // DRAW GRAPHICS
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for screenshake displacement
    this.ctx.save();

    // 1. Draw atmospheric skies, moons, mountains
    this.assets.drawBackground(this.ctx, this.canvas.width, this.canvas.height, this.currentLevel, this.time);

    // Apply screenshake translate and draw particle effects/ghost trails
    this.particles.updateAndDraw(this.ctx, this.canvas.width, this.canvas.height, this.currentLevel);

    // 2. Draw fighters
    if (this.state === "PLAYING" || this.state === "PAUSED") {
      if (this.player) this.player.draw(this.ctx);
      if (this.opponent) this.opponent.draw(this.ctx);
      this.drawFloatingTexts();
    }

    // 3. Draw static combat arena platform block
    this.assets.drawGround(this.ctx, this.canvas.width, this.canvas.height, this.currentLevel);

    this.ctx.restore(); // Restore screenshake translation

    this.drawImpactFlash();

    requestAnimationFrame(() => this.tick());
  }
}

// Instantiate game engine on load
window.addEventListener("load", () => {
  window.game = new GameEngine();
});
