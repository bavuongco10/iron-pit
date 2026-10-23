import * as THREE from 'three';
import { sounds } from './audio.js';

export class Enemy {
  constructor(scene, arena, difficultyConfig) {
    this.scene = scene;
    this.arena = arena;
    this.config = difficultyConfig;

    this.maxHp = this.config.enemyHp;
    this.hp = this.maxHp;
    this.isDead = false;

    this.position = new THREE.Vector3(8, 0, -16);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3(0, 0, 1);
    this.radius = 1.0;

    // AI state
    this.state = 'patrol'; // 'patrol', 'combat', 'flank', 'dash'
    this.timeSinceLastShot = 0;
    this.timeSinceDamaged = 0;
    this.reactionTimer = 0;
    this.hasTargetLock = false;
    this.strafeDirection = 1;
    this.strafeTimer = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.recoil = 0;

    // Animation clocks
    this.animTime = 0;
    this.hitFlashTimer = 0;

    // Build the visual model
    this.mesh = new THREE.Group();
    this.buildEnemyModel();
    this.createFloatingHealthBar();
    this.scene.add(this.mesh);

    // Muzzle flash light
    this.muzzleLight = new THREE.PointLight(0xff2200, 0, 8);
    this.muzzleLight.position.set(0.6, 1.4, 1.2);
    this.mesh.add(this.muzzleLight);

    // Debris fragments for death explosion
    this.debris = [];
  }

  buildEnemyModel() {
    // Sci-Fi Cyber Mech / Armored Android enemy
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.4,
      metalness: 0.8
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x0f1318,
      roughness: 0.6,
      metalness: 0.9
    });

    const redAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.3,
      metalness: 0.5
    });

    // Glowing evil red visor & core
    this.visorMat = new THREE.MeshBasicMaterial({
      color: 0xff0033
    });

    this.coreMat = new THREE.MeshBasicMaterial({
      color: 0xff2200
    });

    this.thrusterMat = new THREE.MeshBasicMaterial({
      color: 0xff6600
    });

    this.materialsList = [armorMat, darkMetalMat, redAccentMat, this.visorMat, this.coreMat, this.thrusterMat];

    // 1. Pelvis / Lower Body
    const pelvisGeo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    this.pelvis = new THREE.Mesh(pelvisGeo, darkMetalMat);
    this.pelvis.position.y = 1.0;
    this.mesh.add(this.pelvis);

    // 2. Torso / Chest with armored chest plate
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.1, 0.8);
    this.torso = new THREE.Mesh(torsoGeo, armorMat);
    this.torso.position.y = 0.75;
    this.pelvis.add(this.torso);

    // Armored Chest Plate
    const chestPlateGeo = new THREE.BoxGeometry(1.1, 0.8, 0.3);
    const chestPlate = new THREE.Mesh(chestPlateGeo, redAccentMat);
    chestPlate.position.set(0, 0.1, 0.38);
    this.torso.add(chestPlate);

    // Glowing Power Core in Chest (Pulsing Heart)
    const coreGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.rotation.x = Math.PI / 2;
    this.coreMesh.position.set(0, 0.1, 0.55);
    this.torso.add(this.coreMesh);

    // 3. Head / Menacing Cyber Helmet
    const headGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
    this.head = new THREE.Mesh(headGeo, darkMetalMat);
    this.head.position.set(0, 0.8, 0);
    this.torso.add(this.head);

    // Predatory Red Visor (horizontal glowing eye slit)
    const visorGeo = new THREE.BoxGeometry(0.5, 0.12, 0.2);
    const visor = new THREE.Mesh(visorGeo, this.visorMat);
    visor.position.set(0, 0.05, 0.28);
    this.head.add(visor);

    // Horns / Crest antennae
    const hornGeo = new THREE.ConeGeometry(0.08, 0.45, 6);
    const leftHorn = new THREE.Mesh(hornGeo, redAccentMat);
    leftHorn.rotation.z = 0.4;
    leftHorn.position.set(-0.3, 0.35, 0);
    this.head.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, redAccentMat);
    rightHorn.rotation.z = -0.4;
    rightHorn.position.set(0.3, 0.35, 0);
    this.head.add(rightHorn);

    // 4. Heavy Shoulder Armor (Pauldrons)
    const shoulderGeo = new THREE.BoxGeometry(0.5, 0.5, 0.6);
    const leftShoulder = new THREE.Mesh(shoulderGeo, redAccentMat);
    leftShoulder.position.set(-0.85, 0.4, 0);
    this.torso.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, redAccentMat);
    rightShoulder.position.set(0.85, 0.4, 0);
    this.torso.add(rightShoulder);

    // 5. Right Arm & Heavy Plasma Blaster Cannon
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.85, 0.2, 0);
    this.torso.add(this.rightArm);

    const armUpperGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6);
    const armUpper = new THREE.Mesh(armUpperGeo, darkMetalMat);
    armUpper.position.y = -0.3;
    this.rightArm.add(armUpper);

    // Plasma Cannon (Gun body)
    const gunBodyGeo = new THREE.BoxGeometry(0.35, 0.35, 1.1);
    this.cannonMesh = new THREE.Mesh(gunBodyGeo, armorMat);
    this.cannonMesh.position.set(0, -0.6, 0.4);
    this.rightArm.add(this.cannonMesh);

    // Dual Barrels
    const barrelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12);
    const barrel1 = new THREE.Mesh(barrelGeo, darkMetalMat);
    barrel1.rotation.x = Math.PI / 2;
    barrel1.position.set(0.08, 0, 0.7);
    this.cannonMesh.add(barrel1);

    const barrel2 = new THREE.Mesh(barrelGeo, darkMetalMat);
    barrel2.rotation.x = Math.PI / 2;
    barrel2.position.set(-0.08, 0, 0.7);
    this.cannonMesh.add(barrel2);

    // Cannon energy coil
    const coilGeo = new THREE.TorusGeometry(0.18, 0.04, 8, 16);
    const coil = new THREE.Mesh(coilGeo, this.coreMat);
    coil.position.set(0, 0, 0.1);
    this.cannonMesh.add(coil);

    // 6. Left Arm / Tactical Combat Shield Gauntlet
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.85, 0.2, 0);
    this.torso.add(this.leftArm);

    const leftArmGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6);
    const leftArmMesh = new THREE.Mesh(leftArmGeo, darkMetalMat);
    leftArmMesh.position.y = -0.3;
    this.leftArm.add(leftArmMesh);

    // Combat Shield Plate
    const shieldPlateGeo = new THREE.BoxGeometry(0.5, 0.9, 0.15);
    const shieldPlate = new THREE.Mesh(shieldPlateGeo, redAccentMat);
    shieldPlate.position.set(0, -0.5, 0.2);
    shieldPlate.rotation.y = 0.3;
    this.leftArm.add(shieldPlate);

    // 7. Bipedal Legs & Boots
    const createLeg = (x) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(x, -0.2, 0);

      // Thigh
      const thighGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.5, 8);
      const thigh = new THREE.Mesh(thighGeo, darkMetalMat);
      thigh.position.y = -0.25;
      legGroup.add(thigh);

      // Knee Armor
      const kneeGeo = new THREE.BoxGeometry(0.24, 0.24, 0.2);
      const knee = new THREE.Mesh(kneeGeo, redAccentMat);
      knee.position.set(0, -0.5, 0.1);
      legGroup.add(knee);

      // Shin
      const shinGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.5, 8);
      const shin = new THREE.Mesh(shinGeo, armorMat);
      shin.position.y = -0.75;
      legGroup.add(shin);

      // Heavy Boot
      const footGeo = new THREE.BoxGeometry(0.3, 0.2, 0.5);
      const foot = new THREE.Mesh(footGeo, darkMetalMat);
      foot.position.set(0, -1.0, 0.1);
      legGroup.add(foot);

      return legGroup;
    };

    this.leftLeg = createLeg(-0.35);
    this.rightLeg = createLeg(0.35);
    this.pelvis.add(this.leftLeg);
    this.pelvis.add(this.rightLeg);

    // 8. Jetpack Thrusters on Back
    const jetpackGeo = new THREE.BoxGeometry(0.7, 0.8, 0.35);
    const jetpack = new THREE.Mesh(jetpackGeo, darkMetalMat);
    jetpack.position.set(0, 0.1, -0.45);
    this.torso.add(jetpack);

    // Thruster Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.3, 12);
    const leftNozzle = new THREE.Mesh(nozzleGeo, this.thrusterMat);
    leftNozzle.position.set(-0.22, -0.45, -0.45);
    this.torso.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, this.thrusterMat);
    rightNozzle.position.set(0.22, -0.45, -0.45);
    this.torso.add(rightNozzle);

    // Cast shadows
    this.mesh.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    this.mesh.position.copy(this.position);
  }

  createFloatingHealthBar() {
    // 3D Canvas sprite for Enemy Health & Nameplate
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 512;
    this.hpCanvas.height = 128;
    this.hpCtx = this.hpCanvas.getContext('2d');

    this.hpTexture = new THREE.CanvasTexture(this.hpCanvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: this.hpTexture,
      transparent: true,
      depthTest: false
    });

    this.hpSprite = new THREE.Sprite(spriteMat);
    this.hpSprite.position.set(0, 2.7, 0);
    this.hpSprite.scale.set(3.2, 0.8, 1);
    this.mesh.add(this.hpSprite);

    this.updateHealthBarTexture();
  }

  updateHealthBarTexture() {
    const ctx = this.hpCtx;
    const w = 512;
    const h = 128;
    ctx.clearRect(0, 0, w, h);

    const hpPercent = Math.max(0, this.hp / this.maxHp);

    // Container box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.fillRect(16, 16, w - 32, h - 32);
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // Header title
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.textAlign = 'left';
    ctx.fillText('TARGET: CYBER-OPPONENT', 32, 50);

    // Difficulty badge
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = this.config.color || '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(this.config.badge || 'COMBAT AI', w - 32, 50);

    // Health bar track
    ctx.fillStyle = '#334155';
    ctx.fillRect(32, 64, w - 64, 28);

    // Health bar fill
    const grad = ctx.createLinearGradient(32, 0, w - 32, 0);
    if (hpPercent > 0.5) {
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(1, '#f97316');
    } else {
      grad.addColorStop(0, '#dc2626');
      grad.addColorStop(1, '#991b1b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(32, 64, (w - 64) * hpPercent, 28);

    // Health numeric text
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp} HP`, w / 2, 86);

    this.hpTexture.needsUpdate = true;
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.hp -= amount;
    this.timeSinceDamaged = 0;
    this.hitFlashTimer = 0.15; // Flash white/red for 150ms

    // Nightmare dash evasion when taking damage
    if (this.config.id === 'nightmare' && Math.random() < 0.45 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = 0.25;
      this.strafeDirection = Math.random() < 0.5 ? -1 : 1;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    } else {
      sounds.playEnemyHurt();
    }

    this.updateHealthBarTexture();
  }

  die() {
    this.isDead = true;
    sounds.playExplosion();

    // Hide main mesh parts
    this.pelvis.visible = false;
    this.hpSprite.visible = false;

    // Create shattering physics fragments
    const fragmentCount = 18;
    const fragGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.8,
      roughness: 0.3
    });

    for (let i = 0; i < fragmentCount; i++) {
      const frag = new THREE.Mesh(fragGeo, fragMat);
      frag.position.copy(this.mesh.position).add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          Math.random() * 1.8 + 0.2,
          (Math.random() - 0.5) * 1.5
        )
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        Math.random() * 8 + 4,
        (Math.random() - 0.5) * 14
      );

      const rotSpeed = new THREE.Vector3(
        Math.random() * 10 - 5,
        Math.random() * 10 - 5,
        Math.random() * 10 - 5
      );

      this.scene.add(frag);
      this.debris.push({ mesh: frag, vel, rotSpeed, life: 3.0 });
    }
  }

  update(delta, playerPos, onEnemyShoot) {
    if (this.isDead) {
      // Update debris fragments
      for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i];
        d.life -= delta;
        d.vel.y -= 25 * delta; // Gravity
        d.mesh.position.addScaledVector(d.vel, delta);
        d.mesh.rotation.x += d.rotSpeed.x * delta;
        d.mesh.rotation.y += d.rotSpeed.y * delta;

        // Bounce on floor
        if (d.mesh.position.y < 0.2) {
          d.mesh.position.y = 0.2;
          d.vel.y *= -0.4;
          d.vel.x *= 0.8;
          d.vel.z *= 0.8;
        }

        if (d.life <= 0) {
          this.scene.remove(d.mesh);
          this.debris.splice(i, 1);
        }
      }
      return;
    }

    this.animTime += delta;
    this.timeSinceLastShot += delta;
    this.timeSinceDamaged += delta;

    // Nightmare shield regeneration if untouched for 3.5s
    if (this.config.shieldRegen > 0 && this.timeSinceDamaged > 3.5 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.config.shieldRegen * delta);
      this.updateHealthBarTexture();
    }

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      const flashColor = this.hitFlashTimer > 0 ? 0xffffff : 0x1f242d;
      this.torso.material.color.setHex(flashColor);
    }

    // Recoil recovery
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - delta * 4);
      this.cannonMesh.position.z = 0.4 - this.recoil * 0.3;
    }

    // Distance and vector to player
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
    toPlayer.y = 0;
    const distanceToPlayer = toPlayer.length();
    const dirToPlayer = toPlayer.clone().normalize();

    // Check line of sight
    const eyePos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const playerChestPos = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const hasLoS = this.arena.checkLineOfSight(eyePos, playerChestPos);

    // AI State Machine & Movement
    let moveDir = new THREE.Vector3();

    // Strafe timer toggle
    this.strafeTimer += delta;
    if (this.strafeTimer > 2.0 + Math.random()) {
      this.strafeTimer = 0;
      this.strafeDirection *= -1;
    }

    // Dash evasion timer
    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Speed calculation
    let currentSpeed = this.config.enemySpeed;
    if (this.isDashing) currentSpeed *= 1.8;

    // Enrage mode for Nightmare when HP < 50%
    if (this.config.id === 'nightmare' && this.hp < this.maxHp * 0.5) {
      currentSpeed *= 1.25;
      this.visorMat.color.setHex(0xff0000);
      this.coreMesh.scale.set(1.4, 1.4, 1.4);
    }

    if (hasLoS) {
      this.reactionTimer += delta;

      // Desired distance is roughly 10-16 meters
      if (distanceToPlayer > 18) {
        // Move towards player
        moveDir.add(dirToPlayer);
      } else if (distanceToPlayer < 7) {
        // Back up if player gets too close
        moveDir.sub(dirToPlayer);
      }

      // Tactical strafing (perpendicular to player)
      const strafeVec = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).multiplyScalar(this.strafeDirection);
      moveDir.add(strafeVec.multiplyScalar(0.75));

      // Aim at player
      const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      // Smoothly rotate towards player
      let rotDiff = targetAngle - this.mesh.rotation.y;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      this.mesh.rotation.y += rotDiff * Math.min(1.0, delta * 6.0);

      // Attempt shooting if reaction time elapsed and cooldown met
      if (this.reactionTimer >= this.config.reactionDelay && this.timeSinceLastShot >= this.config.shootCooldown) {
        this.shoot(playerPos, onEnemyShoot);
      }
    } else {
      // Lost line of sight: Hunt/patrol towards player's last known location or circle obstacles
      this.reactionTimer = Math.max(0, this.reactionTimer - delta * 0.5);
      moveDir.add(dirToPlayer.multiplyScalar(0.8));

      const angle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, angle, delta * 3.0);
    }

    // Apply movement with arena collision
    if (moveDir.lengthSq() > 0.01) {
      moveDir.normalize();
      const moveStep = moveDir.clone().multiplyScalar(currentSpeed * delta);
      const newPos = this.mesh.position.clone().add(moveStep);
      const col = this.arena.checkCollision(newPos, this.radius);
      this.mesh.position.copy(col.correctedPos);

      // Animate walking legs & bobbing torso
      const legAngle = Math.sin(this.animTime * currentSpeed * 1.5) * 0.45;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;
      this.torso.position.y = 0.75 + Math.abs(Math.sin(this.animTime * currentSpeed * 1.5)) * 0.08;
    } else {
      // Idle bob
      this.torso.position.y = 0.75 + Math.sin(this.animTime * 2) * 0.03;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    // Thruster flare when moving fast
    const thrustGlow = (moveDir.lengthSq() > 0.1) ? 1.0 : 0.2;
    this.thrusterMat.color.setRGB(1.0, 0.4 * thrustGlow, 0);

    // Core pulse
    const pulse = 0.8 + 0.3 * Math.sin(this.animTime * 8);
    this.coreMat.color.setRGB(pulse, 0.1, 0.05);

    // Muzzle light fade
    if (this.muzzleLight.intensity > 0) {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - delta * 15);
    }
  }

  shoot(playerPos, onEnemyShoot) {
    this.timeSinceLastShot = 0;
    this.recoil = 1.0;
    this.muzzleLight.intensity = 4.0;

    // Bullet origin at cannon muzzle in world coords
    const muzzleOffset = new THREE.Vector3(0.85, 1.35, 1.4);
    muzzleOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    const origin = this.mesh.position.clone().add(muzzleOffset);

    // Calculate bullet trajectory with accuracy spread
    const target = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)); // Aim at player chest
    const shootDir = new THREE.Vector3().subVectors(target, origin).normalize();

    // Spread inversely proportional to accuracy
    const spreadAngle = (1.0 - this.config.accuracy) * 0.25;
    shootDir.x += (Math.random() - 0.5) * spreadAngle;
    shootDir.y += (Math.random() - 0.5) * spreadAngle * 0.5;
    shootDir.z += (Math.random() - 0.5) * spreadAngle;
    shootDir.normalize();

    sounds.playEnemyShoot();

    if (onEnemyShoot) {
      onEnemyShoot({
        origin,
        direction: shootDir,
        speed: this.config.bulletSpeed,
        damage: this.config.damagePerHit,
        isEnemy: true
      });
    }

    // Nightmare double-barrel rapid pulse
    if (this.config.id === 'nightmare') {
      setTimeout(() => {
        if (!this.isDead && onEnemyShoot) {
          const secondOrigin = origin.clone().add(new THREE.Vector3(0.2, 0, 0));
          sounds.playEnemyShoot();
          onEnemyShoot({
            origin: secondOrigin,
            direction: shootDir,
            speed: this.config.bulletSpeed,
            damage: this.config.damagePerHit * 0.8,
            isEnemy: true
          });
        }
      }, 100);
    }
  }

  reset(difficultyConfig) {
    this.config = difficultyConfig;
    this.maxHp = this.config.enemyHp;
    this.hp = this.maxHp;
    this.isDead = false;
    this.mesh.position.set(8, 0, -16);
    this.mesh.rotation.set(0, 0, 0);
    this.pelvis.visible = true;
    this.hpSprite.visible = true;
    this.timeSinceLastShot = 0;
    this.timeSinceDamaged = 0;
    this.reactionTimer = 0;
    this.isDashing = false;
    this.updateHealthBarTexture();

    // Clean up debris
    for (const d of this.debris) {
      this.scene.remove(d.mesh);
    }
    this.debris = [];
  }
}
