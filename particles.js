/**
 * particles.js - VFX Particle engine and screen shake utility.
 * Adds tactile impact and environmental atmosphere to fight gameplay.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, decay, shape = "circle") {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life; // remaining frames
    this.decay = decay; // life subtracted per frame
    this.shape = shape; // circle, square, leaf, line
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.1;
    this.gravity = 0;
    this.alpha = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.angle += this.rotSpeed;
    this.life -= this.decay;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.shadowBlur = this.alpha > 0.5 ? this.size * 1.5 : 0;
    ctx.shadowColor = this.color;

    if (this.shape === "circle") {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === "square") {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else if (this.shape === "line") {
      ctx.beginPath();
      ctx.lineWidth = this.size;
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2);
      ctx.stroke();
    } else if (this.shape === "leaf") {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ghostTrails = []; // for shadow dash effects
    
    // Screenshake settings
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  /**
   * Reset the particle system
   */
  clear() {
    this.particles = [];
    this.ghostTrails = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  /**
   * Spawn spark particles on normal hits.
   */
  spawnHitSparks(x, y, color) {
    let count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      let angle = Math.random() * Math.PI * 2;
      let speed = 2 + Math.random() * 6;
      let size = 2 + Math.random() * 3;
      let life = 20 + Math.random() * 20;
      let decay = 1;
      
      let p = new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        size, life, decay, "line"
      );
      p.gravity = 0.15; // sparks drop down
      this.particles.push(p);
    }
  }

  /**
   * Spawn shadow/blood splatters on hits.
   */
  spawnBloodSplatters(x, y, color) {
    let count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      let angle = Math.PI + (Math.random() - 0.5) * 1.5; // fly backwards generally
      let speed = 3 + Math.random() * 5;
      let size = 3 + Math.random() * 4;
      let life = 30 + Math.random() * 20;
      let decay = 1;
      
      let p = new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        size, life, decay, "circle"
      );
      p.gravity = 0.25; // gravity pulls drops down
      this.particles.push(p);
    }
  }

  /**
   * Spawn sparks representing defense shield / blocks.
   */
  spawnBlockSparks(x, y, color) {
    // 1. Spawning ring expansion
    let ring = new Particle(x, y, 0, 0, color, 8, 15, 1, "circle");
    ring.update = function() {
      this.size += 3;
      this.life -= this.decay;
      this.alpha = Math.max(0, this.life / this.maxLife);
    };
    ring.draw = function(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    this.particles.push(ring);

    // 2. Spark particles escaping vertically
    let count = 8;
    for (let i = 0; i < count; i++) {
      let angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      let speed = 2 + Math.random() * 4;
      let size = 1.5 + Math.random() * 2;
      let life = 15 + Math.random() * 15;
      let p = new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        size, life, 1, "line"
      );
      p.gravity = 0.08;
      this.particles.push(p);
    }
  }

  /**
   * Spawn dust when jumps, runs, lands.
   */
  spawnDust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      let vx = (Math.random() - 0.5) * 2;
      let vy = -Math.random() * 1.5;
      let size = 4 + Math.random() * 6;
      let life = 20 + Math.random() * 20;
      let color = "rgba(255, 255, 255, 0.15)";
      
      let p = new Particle(x, y, vx, vy, color, size, life, 1, "circle");
      this.particles.push(p);
    }
  }

  spawnSlashArc(x, y, facing, color, type = "light") {
    const arc = new Particle(x, y, 0, 0, color, type === "heavy" ? 34 : 24, type === "heavy" ? 10 : 8, 1, "slash");
    arc.facing = facing;
    arc.type = type;
    arc.update = function() {
      this.size += this.type === "heavy" ? 4.2 : 2.8;
      this.life -= this.decay;
      this.alpha = Math.max(0, this.life / this.maxLife);
    };
    arc.draw = function(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha * (this.type === "heavy" ? 0.62 : 0.5);
      ctx.translate(this.x, this.y);
      ctx.scale(this.facing, 1);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.type === "heavy" ? 6 : 3.5;
      ctx.lineCap = "round";
      ctx.shadowBlur = this.type === "heavy" ? 16 : 10;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      if (this.type === "heavy") {
        ctx.arc(0, 0, this.size, -1.25, 0.75);
      } else {
        ctx.arc(0, 0, this.size, -0.85, 0.45);
      }
      ctx.stroke();

      ctx.globalAlpha = this.alpha * 0.18;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = this.type === "heavy" ? 2 : 1.25;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.72, this.type === "heavy" ? -1.05 : -0.65, this.type === "heavy" ? 0.55 : 0.25);
      ctx.stroke();
      ctx.restore();
    };
    this.particles.push(arc);
  }

  spawnImpactBurst(x, y, color, type = "light") {
    const ring = new Particle(x, y, 0, 0, color, type === "heavy" ? 10 : 7, type === "heavy" ? 10 : 7, 1, "circle");
    ring.update = function() {
      this.size += type === "heavy" ? 4 : 2.8;
      this.life -= this.decay;
      this.alpha = Math.max(0, this.life / this.maxLife);
    };
    ring.draw = function(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha * 0.7;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = type === "heavy" ? 3 : 2;
      ctx.shadowBlur = type === "heavy" ? 14 : 9;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    this.particles.push(ring);

    const rays = type === "heavy" ? 8 : 5;
    for (let i = 0; i < rays; i++) {
      const angle = (Math.PI * 2 / rays) * i + Math.random() * 0.18;
      const speed = (type === "heavy" ? 8 : 5) + Math.random() * 3;
      const p = new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        i % 2 === 0 ? "#ffffff" : color,
        type === "heavy" ? 3 : 2,
        type === "heavy" ? 16 : 11,
        1,
        "line"
      );
      p.gravity = 0.08;
      this.particles.push(p);
    }
  }

  /**
   * Add a ghost trail silhouette copy of a fighter.
   */
  addGhostTrail(x, y, scaleX, drawBodyFn, color, duration = 12) {
    this.ghostTrails.push({
      x, y, scaleX, drawBodyFn, color,
      life: duration, maxLife: duration
    });
  }

  /**
   * Apply a screenshake force.
   */
  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  /**
   * Handle ambient weather effects based on level.
   */
  spawnAmbientWeather(width, height, levelNum) {
    let theme = "neon-night";
    if (levelNum === 3 || levelNum === 4) theme = "bamboo-forest";
    else if (levelNum === 5 || levelNum === 6) theme = "crimson-sunset";
    else if (levelNum === 7 || levelNum === 8) theme = "ruined-temple";
    else if (levelNum === 9 || levelNum === 10) theme = "shadow-portal";

    if (theme === "ruined-temple") {
      // Rain drops
      if (Math.random() > 0.4) {
        let px = Math.random() * width;
        let py = -10;
        let p = new Particle(
          px, py, 
          -4 - Math.random() * 2, // blowing left
          12 + Math.random() * 6, // falling fast
          "rgba(150, 180, 255, 0.4)",
          1.5, 60, 1, "line"
        );
        this.particles.push(p);
      }
    } else if (theme === "bamboo-forest") {
      // Drifting green leaves
      if (Math.random() > 0.95) {
        let px = Math.random() * width;
        let py = -10;
        let p = new Particle(
          px, py,
          -1 - Math.random() * 2,
          1 + Math.random() * 1.5,
          "rgba(0, 255, 136, 0.45)",
          4 + Math.random() * 4,
          180, 1, "leaf"
        );
        p.gravity = 0.01;
        this.particles.push(p);
      }
    } else if (theme === "crimson-sunset") {
      // Rising embers
      if (Math.random() > 0.8) {
        let px = Math.random() * width;
        let py = height - 90; // rise from ground
        let p = new Particle(
          px, py,
          (Math.random() - 0.5) * 1.5,
          -1 - Math.random() * 2,
          "rgba(255, 0, 127, 0.7)",
          2 + Math.random() * 2,
          100, 1, "circle"
        );
        this.particles.push(p);
      }
    } else if (theme === "shadow-portal") {
      // Void floating particles
      if (Math.random() > 0.9) {
        let px = Math.random() * width;
        let py = Math.random() * height;
        let p = new Particle(
          px, py,
          (Math.random() - 0.5) * 0.8,
          -0.5 - Math.random() * 0.8,
          "rgba(157, 78, 221, 0.4)",
          2 + Math.random() * 3,
          120, 1, "square"
        );
        this.particles.push(p);
      }
    }
  }

  updateAndDraw(ctx, width, height, levelNum) {
    // 1. Spawning ambient weather
    this.spawnAmbientWeather(width, height, levelNum);

    // 2. Handle Screenshake calculations
    if (this.shakeDuration > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeDuration--;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Offset canvas if screen is shaking
    if (this.shakeX !== 0 || this.shakeY !== 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    // 3. Update and Draw ghost trails
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      let t = this.ghostTrails[i];
      t.life--;
      
      if (t.life <= 0) {
        this.ghostTrails.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = (t.life / t.maxLife) * 0.45;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scaleX, 1);
      
      // Call the silhouette drawing function with custom ghost color
      t.drawBodyFn(ctx, t.color);
      ctx.restore();
    }

    // 4. Update and Draw active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.update();
      
      if (p.life <= 0 || p.y > height + 20) {
        this.particles.splice(i, 1);
      } else {
        p.draw(ctx);
      }
    }
  }
}
