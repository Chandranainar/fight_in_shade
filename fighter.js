/**
 * fighter.js - Fighter physics, combat mechanics, AI behaviors, and procedural silhouette rendering.
 */

class Fighter {
  constructor({
    x, y,
    color,
    eyeColor,
    isPlayer = false,
    name = "Shadow",
    maxHp = 100,
    weaponType = "fists",
    aiConfig = null,
    stats = null, // for player upgrades
    damageMult = 1.0
  }) {
    this.x = x;
    this.y = y;
    this.width = 60;
    this.height = 110;
    this.color = color || "#09090d";
    this.eyeColor = eyeColor || "#00f2fe";
    this.isPlayer = isPlayer;
    this.name = name;
    this.weaponType = weaponType; // fists, katana, spear, claws, shadow_blade

    // Stats
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.maxEnergy = 100;
    this.energy = 0;
    this.isDead = false;

    // Base Multipliers (Upgradeable for Player, scaled by level for Enemies)
    this.speedMult = stats?.speedMult || 1.0;
    this.damageMult = isPlayer ? (stats?.damageMult || 1.0) : damageMult;
    this.energyRecovery = stats?.energyRecovery || 1.0;
    this.maxHpBonus = stats?.maxHpBonus || 0;
    
    if (isPlayer) {
      this.maxHp = 100 + this.maxHpBonus;
      this.hp = Math.min(this.hp, this.maxHp);
    }

    // Physics
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.5;
    this.friction = 0.82;
    this.isGrounded = false;
    this.jumpCount = 0;
    this.facing = isPlayer ? 1 : -1; // 1 = Right, -1 = Left
    
    // Combat state machine
    this.state = "idle"; // idle, run, jump, fall, dodge, attack_light, attack_heavy, attack_special, block, hit, dead
    this.stateTimer = 0;
    this.blockTimer = 0;
    this.hitStunTimer = 0;
    this.specialCooldown = 0;
    this.dodgeCooldown = 0;
    this.invulnerableTimer = 0;
    
    // Animation timing helper
    this.animTime = 0;
    this.animSpeed = 0.15;
    
    // Hitbox offsets and range configuration based on weapon
    this.setupWeaponStats();

    // AI controls
    this.ai = aiConfig;
    this.aiDecisionTimer = 0;
    this.aiTarget = null;
    this.isAiBlocking = false;
    this.aiMoveDir = 0; // persistent movement direction for AI

    // Reference to particle system to spawn particles
    this.particles = null;
  }

  setupWeaponStats() {
    switch (this.weaponType) {
      case "katana":
        this.atkRange = 105;
        this.atkWidth = 110;
        this.atkHeight = 90;
        this.lightDmg = 12;
        this.heavyDmg = 22;
        this.lightCooldown = 18;
        this.heavyCooldown = 32;
        this.weaponColor = "#e6ffff";
        this.trailColor = "rgba(0, 242, 254, 0.4)";
        break;
      case "spear":
        this.atkRange = 135;
        this.atkWidth = 140;
        this.atkHeight = 40;
        this.lightDmg = 10;
        this.heavyDmg = 20;
        this.lightCooldown = 22;
        this.heavyCooldown = 36;
        this.weaponColor = "#f4f6fa";
        this.trailColor = "rgba(220, 240, 255, 0.35)";
        break;
      case "claws":
        this.atkRange = 75;
        this.atkWidth = 80;
        this.atkHeight = 100;
        this.lightDmg = 9;
        this.heavyDmg = 18;
        this.lightCooldown = 12;
        this.heavyCooldown = 22;
        this.weaponColor = "#ff007f";
        this.trailColor = "rgba(255, 0, 127, 0.5)";
        break;
      case "shadow_blade":
        this.atkRange = 115;
        this.atkWidth = 120;
        this.atkHeight = 100;
        this.lightDmg = 14;
        this.heavyDmg = 26;
        this.lightCooldown = 20;
        this.heavyCooldown = 35;
        this.weaponColor = "#9d4edd";
        this.trailColor = "rgba(157, 78, 221, 0.5)";
        break;
      case "fists":
      default:
        this.atkRange = 65;
        this.atkWidth = 70;
        this.atkHeight = 80;
        this.lightDmg = 8;
        this.heavyDmg = 15;
        this.lightCooldown = 15;
        this.heavyCooldown = 26;
        this.weaponColor = "#ffffff";
        this.trailColor = "rgba(255, 255, 255, 0.3)";
        break;
    }
  }

  update(canvasWidth, canvasHeight, opponent) {
    if (this.isDead) return;

    // Regain energy over time
    if (this.state !== "dead" && this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + 0.08 * this.energyRecovery);
    }

    if (this.specialCooldown > 0) this.specialCooldown--;
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;

    // 1. Manage State timers
    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        // Return to natural state
        if (this.state.startsWith("attack") || this.state === "hit" || this.state === "dodge") {
          this.state = "idle";
        }
      }
    }

    // 2. Physics & Gravity
    this.vy += this.gravity;
    this.vx *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    // Ground collision
    let groundY = canvasHeight - 96 - this.height;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
      
      // Land dust particle trigger
      if (this.state === "fall") {
        this.state = "idle";
        if (this.particles) this.particles.spawnDust(this.x + this.width / 2, this.y + this.height, 6);
      }
    } else {
      this.isGrounded = false;
      if (this.vy > 0 && this.state !== "hit" && !this.state.startsWith("attack")) {
        this.state = "fall";
      }
    }

    // Border clamps
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    } else if (this.x > canvasWidth - this.width) {
      this.x = canvasWidth - this.width;
      this.vx = 0;
    }

    // Face the opponent automatically when not attacking or hit
    if (opponent && !this.isDead && this.state !== "hit" && this.state !== "dodge" && !this.state.startsWith("attack")) {
      this.facing = (opponent.x + opponent.width / 2 > this.x + this.width / 2) ? 1 : -1;
    }

    // 3. AI Brain execution
    if (!this.isPlayer && this.ai && opponent) {
      this.executeAI(opponent);
      
      // Persistently apply chosen movement direction
      if (this.aiMoveDir !== 0) {
        this.move(this.aiMoveDir);
      }
    }

    // Increment animation timer if moving
    if (this.state === "run") {
      this.animTime += this.animSpeed * (Math.abs(this.vx) * 0.25 + 0.5) * this.speedMult;
    } else {
      this.animTime += this.animSpeed;
    }
  }

  /**
   * Action methods called by controllers
   */
  move(direction) {
    if (this.state === "hit" || this.state === "dead" || this.state === "dodge" || this.state.startsWith("attack")) return;

    let speed = 0.8 * this.speedMult;
    this.vx += direction * speed;
    
    // Cap velocity x
    let maxSpeed = 6.5 * this.speedMult;
    if (this.vx > maxSpeed) this.vx = maxSpeed;
    if (this.vx < -maxSpeed) this.vx = -maxSpeed;

    if (this.isGrounded && this.state !== "run") {
      this.state = "run";
      // Spawn tiny running dust sparks
      if (this.particles && Math.random() > 0.6) {
        this.particles.spawnDust(this.x + this.width / 2 - direction * 15, this.y + this.height, 2);
      }
    }
  }

  jump() {
    if (this.state === "hit" || this.state === "dead" || this.state === "dodge" || this.state.startsWith("attack")) return;
    
    if (this.isGrounded) {
      this.vy = -12.5;
      this.isGrounded = false;
      this.jumpCount = 1;
      this.state = "jump";
      if (this.particles) this.particles.spawnDust(this.x + this.width / 2, this.y + this.height, 5);
    } else if (this.jumpCount < 2) {
      // Double Jump
      this.vy = -10.5;
      this.jumpCount = 2;
      this.state = "jump";
      if (this.particles) {
        // Glowing jump ring
        this.particles.spawnBlockSparks(this.x + this.width / 2, this.y + this.height, this.eyeColor);
      }
    }
  }

  stopMove() {
    if (this.state === "run") {
      this.state = "idle";
    }
  }

  block(active) {
    if (this.state === "hit" || this.state === "dead" || this.state === "dodge" || this.state.startsWith("attack")) return;
    
    if (active) {
      this.state = "block";
      this.vx *= 0.5; // slow down block sliding
    } else if (this.state === "block") {
      this.state = "idle";
    }
  }

  dodge(direction = 0) {
    if (this.state === "hit" || this.state === "dead" || this.state.startsWith("attack") || this.state === "block") return;
    if (!this.isGrounded || this.dodgeCooldown > 0) return;

    const dodgeDir = direction !== 0 ? direction : -this.facing;
    this.state = "dodge";
    this.stateTimer = 18;
    this.dodgeCooldown = 48;
    this.invulnerableTimer = 14;
    this.vx = dodgeDir * 13 * this.speedMult;
    this.vy = Math.min(this.vy, -1);

    if (this.particles) {
      this.particles.spawnDust(this.x + this.width / 2, this.y + this.height, 8);
      this.particles.addGhostTrail(
        this.x,
        this.y,
        this.facing,
        (c, col) => this.drawBody(c, col, true),
        this.trailColor,
        12
      );
    }
  }

  attackLight(opponent) {
    if (this.state === "hit" || this.state === "dead" || this.state === "dodge" || this.state.startsWith("attack") || this.state === "block") return;

    this.state = "attack_light";
    this.stateTimer = Math.max(16, this.lightCooldown / this.speedMult);
    
    // Small forward lunge
    this.vx += this.facing * 4 * this.speedMult;

    // Check hit on frame window
    setTimeout(() => {
      this.checkCombatCollision(opponent, "light");
    }, 100);
  }

  attackHeavy(opponent) {
    if (this.state === "hit" || this.state === "dead" || this.state === "dodge" || this.state.startsWith("attack") || this.state === "block") return;

    this.state = "attack_heavy";
    this.stateTimer = Math.max(26, this.heavyCooldown / this.speedMult);
    
    // Stronger forward lunge
    this.vx += this.facing * 6 * this.speedMult;

    // Check hit on frame window
    setTimeout(() => {
      this.checkCombatCollision(opponent, "heavy");
    }, 180);
  }

  attackSpecial(opponent) {
    if (this.state === "hit" || this.state === "dead" || this.state === "dodge" || this.state.startsWith("attack") || this.state === "block") return;
    if (this.energy < 50 || this.specialCooldown > 0) return;

    this.energy -= 50;
    this.specialCooldown = 180; // 3 seconds at 60fps
    this.state = "attack_special";
    
    // Special moves have longer execution window
    this.stateTimer = 40;

    // Fast teleport-dash straight through opponent
    let dashDist = 280 * this.facing;
    let originalX = this.x;
    
    // Perform steps of dash, adding ghost trails
    for (let i = 1; i <= 5; i++) {
      let stepX = originalX + (dashDist / 5) * i;
      
      // Delay ghost trail spawns for visual flow
      setTimeout(() => {
        if (this.isDead) return;
        
        // Spawn ghost trail at this step
        if (this.particles) {
          this.particles.addGhostTrail(
            stepX, this.y, this.facing,
            (c, col) => this.drawBody(c, col, true), // draw custom colored ghost body
            this.trailColor, 15
          );
        }
      }, i * 40);
    }

    // Physically move the character forward rapidly
    this.vx = this.facing * 20;

    // Hit detection happens multiple times during dash lunge
    for (let h = 0; h < 3; h++) {
      setTimeout(() => {
        if (!this.isDead) this.checkCombatCollision(opponent, "special");
      }, 100 + h * 80);
    }
  }

  /**
   * Combat collision calculation
   */
  checkCombatCollision(opponent, type) {
    if (this.isDead || opponent.isDead || opponent.state === "dead") return;
    if (this.state !== `attack_${type}`) return;
    if (opponent.invulnerableTimer > 0) {
      if (this.particles) {
        this.particles.spawnBlockSparks(opponent.x + opponent.width / 2, opponent.y + opponent.height * 0.55, opponent.eyeColor);
      }
      return;
    }

    // Define attack hitbox center relative to fighter position
    let myCenterX = this.x + this.width / 2;
    let myCenterY = this.y + this.height / 2;
    
    // Offset based on facing direction
    let range = this.atkRange;
    if (type === "heavy") range *= 1.2;
    if (type === "special") range *= 1.4;

    let hitboxX = myCenterX + (this.facing * range) - (this.atkWidth / 2);
    let hitboxY = myCenterY - (this.atkHeight / 2);

    // Opponent hurtbox
    let opLeft = opponent.x;
    let opRight = opponent.x + opponent.width;
    let opTop = opponent.y;
    let opBottom = opponent.y + opponent.height;

    // AABB intersection check between attack hitbox and opponent hurtbox
    if (
      hitboxX + this.atkWidth > opLeft &&
      hitboxX < opRight &&
      hitboxY + this.atkHeight > opTop &&
      hitboxY < opBottom
    ) {
      // Impact detected!
      let damage = type === "light" ? this.lightDmg : (type === "heavy" ? this.heavyDmg : 20);
      damage *= this.damageMult;

      opponent.takeDamage(damage, this.facing, type, this.particles);
    }
  }

  takeDamage(amount, direction, type, particles) {
    if (this.isDead) return;
    this.lastDamageTaken = 0;
    this.lastHitBlocked = false;
    this.lastHitDodged = false;

    if (this.invulnerableTimer > 0) {
      this.lastHitDodged = true;
      return;
    }

    // 1. Calculate Block Reduction
    if (this.state === "block" && !this.isDead) {
      let blockReduction = 0.85; // 85% damage reduction
      let finalDmg = Math.max(1, Math.round(amount * (1 - blockReduction)));
      this.lastDamageTaken = finalDmg;
      this.lastHitBlocked = true;
      this.hp = Math.max(0, this.hp - finalDmg);

      // Spark particles on blocking shield
      if (particles) {
        particles.spawnBlockSparks(
          this.x + (direction > 0 ? 0 : this.width),
          this.y + this.height * 0.45,
          this.eyeColor
        );
        particles.shake(2, 6);
      }
      if (this.hp <= 0) {
        this.isDead = true;
        this.state = "dead";
        this.vx = direction * 5;
        this.vy = -4;
      }
      return;
    }

    // 2. Normal hit state
    const finalDmg = Math.round(amount);
    this.lastDamageTaken = finalDmg;
    this.hp = Math.max(0, this.hp - finalDmg);
    
    // Trigger HIT Stun
    this.state = "hit";
    let stunDuration = type === "light" ? 15 : (type === "heavy" ? 25 : 30);
    this.stateTimer = stunDuration;
    
    // Knockback
    let knockbackX = type === "light" ? 4 : (type === "heavy" ? 10 : 8);
    let knockbackY = type === "heavy" ? -5 : (type === "special" ? -2 : 0);
    
    this.vx = direction * knockbackX;
    this.vy = knockbackY;

    // Hit particle effects
    if (particles) {
      let sparkColor = type === "special" ? this.trailColor : "#ffaa00";
      let bloodColor = this.color === "#09090d" ? "rgba(0, 242, 254, 0.4)" : "rgba(255, 0, 127, 0.5)"; // glow blood based on eye
      
      particles.spawnHitSparks(this.x + this.width / 2, this.y + this.height * 0.4, sparkColor);
      particles.spawnBloodSplatters(this.x + this.width / 2, this.y + this.height * 0.4, bloodColor);
      
      let shakeForce = type === "light" ? 4 : (type === "heavy" ? 10 : 8);
      particles.shake(shakeForce, 12);
    }

    // Check Death
    if (this.hp <= 0) {
      this.isDead = true;
      this.state = "dead";
      this.vx = direction * 8; // fly back on death
      this.vy = -6;
    }
  }

  /**
   * AI Decision logic
   */
  executeAI(player) {
    this.aiDecisionTimer++;
    if (this.aiDecisionTimer < this.ai.decisionInterval) return;
    this.aiDecisionTimer = 0;

    let dist = Math.abs(this.x - player.x);
    let randomVal = Math.random();

    // 1. Keep track of state
    if (this.state === "dead" || this.state === "hit" || this.state.startsWith("attack")) return;

    // React to player special attack by blocking
    if (player.state === "attack_heavy" && dist < this.atkRange + 45 && randomVal < (this.ai.dodgeRate || 0.18)) {
      const awayFromPlayer = player.x > this.x ? -1 : 1;
      this.dodge(awayFromPlayer);
      this.aiMoveDir = 0;
      return;
    }

    if (player.state === "attack_special" && dist < 300 && randomVal < this.ai.blockRate * 1.5) {
      this.block(true);
      this.isAiBlocking = true;
      this.aiMoveDir = 0;
      return;
    }

    // React to player attacks in range
    if (player.state.startsWith("attack") && dist < this.atkRange + 20) {
      if (randomVal < this.ai.blockRate) {
        this.block(true);
        this.isAiBlocking = true;
        this.aiMoveDir = 0;
        return;
      }
    }

    // Relinquish blocking if active
    if (this.isAiBlocking) {
      this.block(false);
      this.isAiBlocking = false;
    }

    // Range-based activities
    if (dist > this.atkRange + 15) {
      // Too far away, run to player
      this.aiMoveDir = (player.x > this.x) ? 1 : -1;
    } else {
      // Within attack range
      this.aiMoveDir = 0;
      this.stopMove();
      
      if (randomVal < 0.45) {
        // Perform standard light attack
        this.attackLight(player);
      } else if (randomVal < 0.70) {
        // Perform heavy attack
        this.attackHeavy(player);
      } else if (randomVal < 0.85 && this.energy >= 50) {
        // Perform special dash attack
        this.attackSpecial(player);
      } else {
        // Idle/Positioning/Block briefly
        if (randomVal > 0.90) {
          this.block(true);
          this.isAiBlocking = true;
          this.aiMoveDir = 0;
          setTimeout(() => {
            if (!this.isDead && this.state === "block") {
              this.block(false);
              this.isAiBlocking = false;
            }
          }, 300);
        }
      }
    }
  }

  /**
   * Renders the character skeleton and weapon procedurally.
   */
  draw(ctx) {
    ctx.save();
    if (this.invulnerableTimer > 0 && this.state === "dodge") {
      ctx.globalAlpha = 0.62 + Math.sin(this.invulnerableTimer) * 0.18;
    }

    // 1. Position shift and Flip horizontally based on facing direction
    ctx.translate(this.x + this.width / 2, this.y);
    ctx.scale(this.facing, 1);

    // Render debug boxes if needed, currently just procedural drawing
    this.drawBody(ctx, this.color, false);

    ctx.restore();
  }

  /**
   * Procedural Silhouette Body Construction
   */
  drawBody(ctx, fillColor, isGhost = false) {
    ctx.fillStyle = fillColor;

    // Joint math anchors
    let t = this.animTime;
    let headX = 0, headY = 15;
    let torsoY = 40;
    
    // Angle limits & math based on state
    let legL_Angle = 0, legR_Angle = 0;
    let armL_Angle = 0, armR_Angle = 0;
    let torsoTilt = 0;
    let torsoBob = 0;

    if (this.state === "idle") {
      torsoBob = Math.sin(t * 0.4) * 2;
      legL_Angle = 0.1 + Math.sin(t * 0.4) * 0.05;
      legR_Angle = -0.1 - Math.sin(t * 0.4) * 0.05;
      armL_Angle = 0.3 + Math.sin(t * 0.4) * 0.08;
      armR_Angle = -0.2 - Math.sin(t * 0.4) * 0.08;
    } else if (this.state === "run") {
      torsoTilt = 0.15; // lean forward
      torsoBob = Math.abs(Math.sin(t)) * 4;
      legL_Angle = Math.sin(t) * 0.8;
      legR_Angle = -Math.sin(t) * 0.8;
      armL_Angle = -Math.sin(t) * 0.9;
      armR_Angle = Math.sin(t) * 0.9;
    } else if (this.state === "jump") {
      legL_Angle = 0.4;
      legR_Angle = -0.2;
      armL_Angle = -1.2;
      armR_Angle = -1.0;
    } else if (this.state === "fall") {
      legL_Angle = 0.1;
      legR_Angle = 0.1;
      armL_Angle = -0.5;
      armR_Angle = -0.4;
    } else if (this.state === "dodge") {
      torsoTilt = -0.55;
      torsoBob = 7;
      legL_Angle = -0.75;
      legR_Angle = 0.7;
      armL_Angle = -0.25;
      armR_Angle = -0.55;
    } else if (this.state === "attack_light") {
      torsoTilt = 0.25;
      legL_Angle = 0.4;
      legR_Angle = -0.3;
      // Front arm punches forward
      armL_Angle = -1.4; 
      armR_Angle = 0.4;
    } else if (this.state === "attack_heavy") {
      torsoTilt = -0.1;
      legL_Angle = -1.1; // kick forward leg up high!
      legR_Angle = 0.4;
      armL_Angle = 0.5;
      armR_Angle = -0.4;
    } else if (this.state === "attack_special") {
      torsoTilt = 0.4; // deep dash pose
      legL_Angle = 1.0;
      legR_Angle = -0.8;
      armL_Angle = -1.7; // reach completely straight
      armR_Angle = 0.8;
    } else if (this.state === "block") {
      torsoTilt = -0.15;
      legL_Angle = 0.3;
      legR_Angle = -0.3;
      armL_Angle = -0.8; // shield arms crossed
      armR_Angle = -0.8;
    } else if (this.state === "hit") {
      torsoTilt = -0.4; // recoil back
      torsoBob = -5;
      legL_Angle = -0.5;
      legR_Angle = 0.3;
      armL_Angle = -0.2;
      armR_Angle = -0.8;
    } else if (this.state === "dead") {
      // Render lying down flat
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-this.height * 0.7, -15);
      legL_Angle = 0.1;
      legR_Angle = 0.2;
      armL_Angle = 0.2;
      armR_Angle = 0.3;
    }

    // DRAWING SKELETON LAYER BY LAYER
    
    // Left Leg (Back layer)
    this.drawLeg(ctx, -10, 75 + torsoBob, legL_Angle, fillColor);

    // Right Leg (Front layer)
    this.drawLeg(ctx, 10, 75 + torsoBob, legR_Angle, fillColor);

    // Torso (Spine)
    ctx.save();
    ctx.translate(0, torsoY + torsoBob);
    ctx.rotate(torsoTilt);
    
    // Draw thick torso silhouette
    ctx.beginPath();
    ctx.ellipse(0, 20, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(headX, headY - 18, 14, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Eye (Only draw if NOT a ghost)
    if (!isGhost) {
      ctx.fillStyle = this.eyeColor;
      ctx.shadowColor = this.eyeColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      // Draw eyes facing forward (facing is handled by canvas scale)
      ctx.arc(6, headY - 20, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = fillColor; // reset
    }

    // Left Arm (Back layer)
    this.drawArm(ctx, -14, 6, armL_Angle, fillColor, false);

    // Right Arm (Front layer + carries weapon)
    this.drawArm(ctx, 14, 6, armR_Angle, fillColor, true, isGhost);

    ctx.restore(); // Restore torso rotation
  }

  drawLeg(ctx, startX, startY, angle, color) {
    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(angle);
    
    ctx.fillStyle = color;
    
    // Upper leg thigh
    ctx.beginPath();
    ctx.ellipse(0, 15, 8, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Knee joint
    ctx.translate(0, 30);
    
    // Lower leg calf
    ctx.beginPath();
    ctx.ellipse(0, 12, 6, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Foot
    ctx.fillRect(-5, 24, 15, 6);

    ctx.restore();
  }

  drawArm(ctx, startX, startY, angle, color, hasWeapon, isGhost = false) {
    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(angle);
    
    ctx.fillStyle = color;

    // Upper arm
    ctx.beginPath();
    ctx.ellipse(0, 12, 6, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elbow
    ctx.translate(0, 22);

    // Lower arm
    ctx.beginPath();
    ctx.ellipse(0, 10, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hand/Fist
    ctx.beginPath();
    ctx.arc(0, 20, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Weapon if equipped and this is the front arm
    if (hasWeapon && this.weaponType !== "fists") {
      this.drawWeaponEntity(ctx, isGhost);
    }

    ctx.restore();
  }

  drawWeaponEntity(ctx, isGhost) {
    ctx.save();
    
    // Position weapon in the hand
    ctx.translate(0, 18);
    ctx.rotate(-Math.PI / 4); // Default hold angle

    // Glowing parameters
    ctx.strokeStyle = this.weaponColor;
    ctx.fillStyle = this.weaponColor;
    
    if (!isGhost) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.weaponColor;
    }

    if (this.weaponType === "katana") {
      ctx.lineWidth = 3.5;
      
      // Hilt/Guard
      ctx.fillStyle = "#111";
      ctx.fillRect(-6, -2, 12, 4);
      
      // Curved blade
      ctx.strokeStyle = this.weaponColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(5, -45, 10, -75);
      ctx.stroke();

    } else if (this.weaponType === "spear") {
      ctx.lineWidth = 3;
      
      // Long shaft (drawn in dark gray)
      ctx.strokeStyle = "#33333b";
      ctx.beginPath();
      ctx.moveTo(0, 45);
      ctx.lineTo(0, -90);
      ctx.stroke();

      // Spear tip (glowing)
      ctx.strokeStyle = this.weaponColor;
      ctx.fillStyle = this.weaponColor;
      ctx.beginPath();
      ctx.moveTo(-5, -90);
      ctx.lineTo(0, -112);
      ctx.lineTo(5, -90);
      ctx.closePath();
      ctx.fill();

    } else if (this.weaponType === "claws") {
      // Glow claws directly on knuckle
      ctx.strokeStyle = this.weaponColor;
      ctx.lineWidth = 2.2;
      
      // 3 long glowing claw blades
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3, 0);
        ctx.lineTo(i * 6, -24);
        ctx.stroke();
      }
      
    } else if (this.weaponType === "shadow_blade") {
      ctx.lineWidth = 5;
      // Heavy double-sided greatsword blade
      ctx.fillStyle = "#111";
      ctx.fillRect(-8, -4, 16, 5); // guard

      ctx.strokeStyle = this.weaponColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -85);
      ctx.stroke();

      // Core shard detail
      ctx.fillStyle = this.weaponColor;
      ctx.beginPath();
      ctx.moveTo(-6, -20);
      ctx.lineTo(0, -80);
      ctx.lineTo(6, -20);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
