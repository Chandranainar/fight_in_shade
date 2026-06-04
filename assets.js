/**
 * assets.js - Dynamic vector asset drawing system for Shadow Fighter.
 * Generates beautiful, scalable, atmospheric parallax backgrounds without external files.
 */

class GameAssets {
  constructor() {
    this.lightningTimer = 0;
    this.lightningFlash = 0;
  }

  /**
   * Draw the entire battle background based on level specifications.
   */
  drawBackground(ctx, width, height, levelNum, time) {
    // Determine theme based on level
    let theme = "neon-night";
    if (levelNum === 3 || levelNum === 4) theme = "bamboo-forest";
    else if (levelNum === 5 || levelNum === 6) theme = "crimson-sunset";
    else if (levelNum === 7 || levelNum === 8) theme = "ruined-temple";
    else if (levelNum === 9 || levelNum === 10) theme = "shadow-portal";

    ctx.save();

    // 1. Base Sky Gradient
    let skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (theme === "neon-night") {
      skyGrad.addColorStop(0, "#030206");
      skyGrad.addColorStop(0.5, "#0b0818");
      skyGrad.addColorStop(1, "#180f30");
    } else if (theme === "bamboo-forest") {
      skyGrad.addColorStop(0, "#010405");
      skyGrad.addColorStop(0.5, "#061314");
      skyGrad.addColorStop(1, "#112e28");
    } else if (theme === "crimson-sunset") {
      skyGrad.addColorStop(0, "#080104");
      skyGrad.addColorStop(0.5, "#25050f");
      skyGrad.addColorStop(1, "#44091a");
    } else if (theme === "ruined-temple") {
      skyGrad.addColorStop(0, "#020306");
      skyGrad.addColorStop(0.6, "#0b0c16");
      skyGrad.addColorStop(1, "#1c1e30");
    } else { // shadow-portal
      skyGrad.addColorStop(0, "#04010a");
      skyGrad.addColorStop(0.5, "#150527");
      skyGrad.addColorStop(1, "#2a0845");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Lightning effect for ruined temple
    if (theme === "ruined-temple") {
      this.lightningTimer += Math.random() * 2;
      if (this.lightningTimer > 250) {
        this.lightningFlash = Math.random() > 0.5 ? 0.8 : 0.4;
        this.lightningTimer = 0;
      }
      if (this.lightningFlash > 0) {
        ctx.fillStyle = `rgba(220, 240, 255, ${this.lightningFlash})`;
        ctx.fillRect(0, 0, width, height);
        this.lightningFlash -= 0.05;
      }
    }

    // 2. The Moon / Celestial Body
    ctx.save();
    let moonX = width * 0.75;
    let moonY = height * 0.28;
    let moonRadius = 60;
    
    // Animate moon position slightly based on time
    moonY += Math.sin(time * 0.0005) * 10;

    let moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius);
    let glowColor = "#ffffff";
    let coreColor = "#ffffff";

    if (theme === "neon-night") {
      glowColor = "rgba(0, 242, 254, 0.4)";
      coreColor = "#e6ffff";
    } else if (theme === "bamboo-forest") {
      glowColor = "rgba(0, 255, 136, 0.3)";
      coreColor = "#effff5";
    } else if (theme === "crimson-sunset") {
      glowColor = "rgba(255, 0, 127, 0.6)";
      coreColor = "#ffccd5";
    } else if (theme === "ruined-temple") {
      glowColor = "rgba(200, 220, 255, 0.3)";
      coreColor = "#f4f6fa";
    } else { // shadow-portal
      glowColor = "rgba(157, 78, 221, 0.7)";
      coreColor = "#f3e8ff";
      
      // Draw concentric rings around portal moon
      ctx.strokeStyle = "rgba(157, 78, 221, 0.15)";
      ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius + i * 25 + Math.sin(time * 0.002 + i) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    moonGrad.addColorStop(0, coreColor);
    moonGrad.addColorStop(0.2, coreColor);
    moonGrad.addColorStop(0.8, glowColor);
    moonGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

    // Draw main glowing moon
    ctx.fillStyle = moonGrad;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius + 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Parallax Mountain Layers (Distant, Mid)
    this.drawMountains(ctx, width, height, theme, time);

    // 4. Foreground Structures / Silhouette Pillars / Pagodas
    this.drawMidgroundAssets(ctx, width, height, theme, time);

    ctx.restore();
  }

  /**
   * Draw mountains in parallax layers.
   */
  drawMountains(ctx, width, height, theme, time) {
    ctx.save();
    
    // Distant mountain colors
    let distColor = "#0d0a15";
    let nearColor = "#08050e";
    
    if (theme === "bamboo-forest") {
      distColor = "#071212";
      nearColor = "#030a0a";
    } else if (theme === "crimson-sunset") {
      distColor = "#1e040c";
      nearColor = "#0f0105";
    } else if (theme === "ruined-temple") {
      distColor = "#121420";
      nearColor = "#090a10";
    } else if (theme === "shadow-portal") {
      distColor = "#19082e";
      nearColor = "#0c0317";
    }

    // Layer 1: Distant Peaks (Back)
    ctx.fillStyle = distColor;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    // Generate organic mountain peaks
    let peaks1 = [
      { x: 0, y: height * 0.55 },
      { x: width * 0.2, y: height * 0.4 },
      { x: width * 0.35, y: height * 0.48 },
      { x: width * 0.5, y: height * 0.35 },
      { x: width * 0.7, y: height * 0.5 },
      { x: width * 0.85, y: height * 0.38 },
      { x: width, y: height * 0.58 }
    ];
    ctx.lineTo(peaks1[0].x, peaks1[0].y);
    for (let i = 1; i < peaks1.length; i++) {
      ctx.lineTo(peaks1[i].x, peaks1[i].y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Mid Peaks (Front)
    ctx.fillStyle = nearColor;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    let peaks2 = [
      { x: 0, y: height * 0.65 },
      { x: width * 0.15, y: height * 0.52 },
      { x: width * 0.3, y: height * 0.6 },
      { x: width * 0.48, y: height * 0.48 },
      { x: width * 0.65, y: height * 0.58 },
      { x: width * 0.8, y: height * 0.5 },
      { x: width, y: height * 0.68 }
    ];
    ctx.lineTo(peaks2[0].x, peaks2[0].y);
    for (let i = 1; i < peaks2.length; i++) {
      ctx.lineTo(peaks2[i].x, peaks2[i].y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw decorative assets in the mid-ground.
   */
  drawMidgroundAssets(ctx, width, height, theme, time) {
    ctx.save();
    ctx.fillStyle = "#000000"; // Pure silhouette for midground/foreground
    
    if (theme === "bamboo-forest") {
      // Draw silhouetted bamboo trees
      this.drawBambooGrove(ctx, width, height);
    } else if (theme === "ruined-temple") {
      // Draw pagoda on the side
      this.drawPagoda(ctx, width * 0.1, height * 0.35, 120);
      this.drawPagoda(ctx, width * 0.82, height * 0.42, 90);
    } else if (theme === "shadow-portal") {
      // Draw floating obelisks
      this.drawFloatingObelisks(ctx, width, height, time);
    } else { // neon-night or crimson-sunset
      // Simple silhouetted arch / Tori Gate
      this.drawToriiGate(ctx, width * 0.12, height * 0.35, 100);
      this.drawToriiGate(ctx, width * 0.78, height * 0.35, 100);
    }

    ctx.restore();
  }

  drawToriiGate(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.translate(x, y);

    // Left and Right pillars
    ctx.fillRect(0, 0, size * 0.1, size * 1.5);
    ctx.fillRect(size * 0.9, 0, size * 0.1, size * 1.5);

    // Lower lintel
    ctx.fillRect(-size * 0.1, size * 0.25, size * 1.2, size * 0.12);

    // Upper lintel (curved)
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, 0);
    ctx.quadraticCurveTo(size * 0.5, -size * 0.15, size * 1.2, 0);
    ctx.lineTo(size * 1.15, size * 0.12);
    ctx.quadraticCurveTo(size * 0.5, 0, -size * 0.15, size * 0.12);
    ctx.closePath();
    ctx.fill();

    // Base blocks
    ctx.fillRect(-size * 0.03, size * 1.45, size * 0.16, size * 0.06);
    ctx.fillRect(size * 0.87, size * 1.45, size * 0.16, size * 0.06);

    ctx.restore();
  }

  drawPagoda(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.translate(x, y);

    let floors = 3;
    let currentWidth = size;
    let floorHeight = size * 0.35;
    let currentY = floorHeight * floors;

    // Draw base
    ctx.fillRect(size * 0.15, currentY, size * 0.7, floorHeight * 0.5);

    for (let f = 0; f < floors; f++) {
      currentY -= floorHeight;
      // Core room
      ctx.fillRect(currentWidth * 0.2, currentY, currentWidth * 0.6, floorHeight);
      
      // Roof (curved flare)
      ctx.beginPath();
      ctx.moveTo(-currentWidth * 0.1, currentY);
      ctx.quadraticCurveTo(currentWidth * 0.5, currentY - floorHeight * 0.3, currentWidth * 1.1, currentY);
      ctx.lineTo(currentWidth * 1.0, currentY + floorHeight * 0.15);
      ctx.quadraticCurveTo(currentWidth * 0.5, currentY + floorHeight * 0.02, 0, currentY + floorHeight * 0.15);
      ctx.closePath();
      ctx.fill();

      currentWidth *= 0.8;
      ctx.translate((size - currentWidth) / 2, 0);
    }

    // Spire
    ctx.fillRect(currentWidth * 0.45, currentY - floorHeight * 0.8, currentWidth * 0.1, floorHeight * 0.8);
    ctx.restore();
  }

  drawBambooGrove(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = "#000000";
    
    // Draw 8 stalks of bamboo at various spots
    let stalks = [
      { x: width * 0.05, w: 12 },
      { x: width * 0.09, w: 8 },
      { x: width * 0.14, w: 15 },
      { x: width * 0.22, w: 6 },
      { x: width * 0.78, w: 7 },
      { x: width * 0.84, w: 14 },
      { x: width * 0.88, w: 9 },
      { x: width * 0.94, w: 12 }
    ];

    stalks.forEach(s => {
      // Draw stalk segment by segment
      let curY = height;
      let targetY = height * 0.2;
      let segHeight = 45;
      let segment = 0;

      while (curY > targetY) {
        ctx.fillRect(s.x, curY - segHeight + 2, s.w, segHeight - 4);
        // Draw node line
        ctx.fillRect(s.x - 2, curY - segHeight, s.w + 4, 3);
        
        // Draw leaf clusters on sides
        const leafSeed = Math.sin((s.x + segment * 17) * 12.9898) * 43758.5453;
        const leafRoll = leafSeed - Math.floor(leafSeed);
        if (leafRoll > 0.4) {
          const isRight = leafRoll > 0.68;
          this.drawBambooLeaves(ctx, s.x + (isRight ? s.w : -8), curY - segHeight * 0.5, isRight);
        }
        
        curY -= segHeight;
        segment++;
      }
    });

    ctx.restore();
  }

  drawBambooLeaves(ctx, x, y, isRight = true) {
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.translate(x, y);
    
    let angle = isRight ? 0.3 : -0.3;
    ctx.rotate(angle);

    // Draw small stem
    ctx.fillRect(0, 0, isRight ? 15 : -15, 2);

    // Leaves
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(isRight ? 10 + i * 5 : -10 - i * 5, -3 + i * 2);
      ctx.rotate(0.2 - i * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  drawFloatingObelisks(ctx, width, height, time) {
    ctx.save();
    ctx.fillStyle = "#000000";
    
    // Obelisks floating up and down
    let positions = [
      { x: width * 0.08, y: height * 0.45, w: 25, h: 90, speed: 0.0018 },
      { x: width * 0.18, y: height * 0.52, w: 15, h: 50, speed: 0.0022 },
      { x: width * 0.82, y: height * 0.48, w: 20, h: 70, speed: 0.0015 },
      { x: width * 0.91, y: height * 0.54, w: 12, h: 40, speed: 0.0025 }
    ];

    positions.forEach(o => {
      let offset = Math.sin(time * o.speed) * 15;
      let finalY = o.y + offset;

      ctx.save();
      ctx.translate(o.x, finalY);

      // Draw diamond / shard shaped pillar
      ctx.beginPath();
      ctx.moveTo(o.w / 2, 0);
      ctx.lineTo(o.w, o.h * 0.2);
      ctx.lineTo(o.w * 0.8, o.h * 0.8);
      ctx.lineTo(o.w / 2, o.h);
      ctx.lineTo(o.w * 0.2, o.h * 0.8);
      ctx.lineTo(0, o.h * 0.2);
      ctx.closePath();
      ctx.fill();

      // Glowing shard core line
      ctx.strokeStyle = "rgba(157, 78, 221, 0.4)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#9d4edd";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(o.w / 2, o.h * 0.15);
      ctx.lineTo(o.w / 2, o.h * 0.85);
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
  }

  /**
   * Draw the battlefield platform.
   */
  drawGround(ctx, width, height, levelNum) {
    ctx.save();
    
    // Choose ground style based on level
    let theme = "neon-night";
    if (levelNum === 3 || levelNum === 4) theme = "bamboo-forest";
    else if (levelNum === 5 || levelNum === 6) theme = "crimson-sunset";
    else if (levelNum === 7 || levelNum === 8) theme = "ruined-temple";
    else if (levelNum === 9 || levelNum === 10) theme = "shadow-portal";

    let groundY = height - 96; // Ground height is 96px

    // 1. Draw base ground black silhouette
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, groundY, width, 96);

    // 2. Draw ground neon trim or styling
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    
    if (theme === "neon-night") {
      ctx.strokeStyle = "#00f2fe";
      ctx.shadowColor = "#00f2fe";
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(width, groundY + 2);
      ctx.stroke();

      // Grid perspective lines
      ctx.strokeStyle = "rgba(0, 242, 254, 0.25)";
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      for (let i = -100; i < width + 100; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        // Perspective angle lines
        let targetX = i + (i - width/2) * 0.6;
        ctx.lineTo(targetX, height);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let i = 0; i <= 96; i += 24) {
        ctx.strokeStyle = `rgba(0, 242, 254, ${0.15 * (i/96)})`;
        ctx.beginPath();
        ctx.moveTo(0, groundY + i);
        ctx.lineTo(width, groundY + i);
        ctx.stroke();
      }

    } else if (theme === "bamboo-forest") {
      ctx.strokeStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(width, groundY + 2);
      ctx.stroke();

      // Draw stylized moss / grass clumps
      ctx.fillStyle = "#000000";
      ctx.shadowBlur = 0;
      for (let i = 20; i < width; i += 120) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.quadraticCurveTo(i + 15, groundY - 12, i + 30, groundY);
        ctx.quadraticCurveTo(i + 40, groundY - 8, i + 50, groundY);
        ctx.closePath();
        ctx.fill();
        
        // Draw tiny neon leaves on the grass
        ctx.strokeStyle = "rgba(0, 255, 136, 0.6)";
        ctx.beginPath();
        ctx.moveTo(i + 15, groundY - 4);
        ctx.lineTo(i + 22, groundY - 10);
        ctx.stroke();
      }

    } else if (theme === "crimson-sunset") {
      ctx.strokeStyle = "#ff007f";
      ctx.shadowColor = "#ff007f";
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(width, groundY + 2);
      ctx.stroke();

      // Jagged lava cracks in the rock floor
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 0, 127, 0.7)";
      
      let lavaCracks = [
        [100, 150, 130, 220, 250],
        [400, 430, 410, 480, 520],
        [750, 780, 810, 800, 860]
      ];
      
      lavaCracks.forEach(crack => {
        ctx.beginPath();
        let curX = crack[0];
        let curY = groundY + 5;
        ctx.moveTo(curX, curY);
        
        for (let idx = 1; idx < crack.length; idx++) {
          curX = crack[idx];
          curY += 20;
          ctx.lineTo(curX, curY);
        }
        ctx.stroke();
      });

    } else if (theme === "ruined-temple") {
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(width, groundY + 2);
      ctx.stroke();

      // Draw stone slabs/cracks
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      
      for (let i = 60; i < width; i += 90) {
        // Vertical slab separators
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.lineTo(i - 20, height);
        ctx.stroke();
      }

    } else { // shadow-portal
      ctx.strokeStyle = "#9d4edd";
      ctx.shadowColor = "#9d4edd";
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(width, groundY + 2);
      ctx.stroke();

      // Draw rune glyphs on floor
      ctx.font = "12px 'Orbitron'";
      ctx.fillStyle = "rgba(157, 78, 221, 0.4)";
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#9d4edd";
      
      let runes = ["Ω", "Ψ", "Φ", "Ξ", "Λ", "Θ", "Σ", "Γ", "Δ"];
      for (let i = 50; i < width; i += 120) {
        let rIndex = Math.floor((i + levelNum) % runes.length);
        ctx.fillText(runes[rIndex], i, groundY + 30);
      }
    }

    ctx.restore();
  }
}
