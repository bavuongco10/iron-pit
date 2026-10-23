import * as THREE from 'three';
import { sounds } from './audio.js';

export class Player {
  constructor(camera, arena, domElement) {
    this.camera = camera;
    this.arena = arena;
    this.domElement = domElement;

    // Stats
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.maxShield = 50;
    this.shield = this.maxShield;
    this.isDead = false;

    // Weapon stats
    this.maxAmmo = 30;
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.reloadDuration = 1.4; // 1.4 seconds reload
    this.fireCooldown = 0.16; // 6.25 shots per second
    this.timeSinceLastShot = 0;
    this.damage = 25;
    this.bulletSpeed = 65;

    // Position & Orientation
    this.position = new THREE.Vector3(0, 1.6, 18);
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.yaw = 0; // Horizontal rotation
    this.pitch = 0; // Vertical rotation
    this.radius = 0.8;

    // Movement speeds
    this.walkSpeed = 8.5;
    this.turnSpeed = 2.4; // radians per second for Arrow Left / Right
    this.velocity = new THREE.Vector3();
    this.isPointerLocked = false;

    // Key states
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      Space: false,
      KeyR: false
    };

    // Damage recovery & shield regen
    this.timeSinceDamaged = 0;

    // Build first-person weapon model attached to camera
    this.buildWeaponModel();

    // Setup input listeners
    this.setupInputs();
  }

  buildWeaponModel() {
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.position.set(0.28, -0.28, -0.6); // Lower-right corner of camera
    this.camera.add(this.weaponGroup);

    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25
    });

    const cyanNeonMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4
    });

    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7
    });

    // Gun main receiver
    const receiverGeo = new THREE.BoxGeometry(0.1, 0.14, 0.5);
    const receiver = new THREE.Mesh(receiverGeo, gunMat);
    this.weaponGroup.add(receiver);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12);
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.4);
    this.weaponGroup.add(barrel);

    // Cyan Neon Energy Rail on top of rifle
    const railGeo = new THREE.BoxGeometry(0.04, 0.02, 0.45);
    const rail = new THREE.Mesh(railGeo, cyanNeonMat);
    rail.position.set(0, 0.08, -0.15);
    this.weaponGroup.add(rail);

    // Gun Handle / Grip
    const gripGeo = new THREE.BoxGeometry(0.08, 0.22, 0.12);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.15, 0.1);
    grip.rotation.x = -0.3;
    this.weaponGroup.add(grip);

    // Weapon Muzzle Light
    this.muzzleLight = new THREE.PointLight(0x06b6d4, 0, 8);
    this.muzzleLight.position.set(0, 0.02, -0.65);
    this.weaponGroup.add(this.muzzleLight);

    // Weapon Sway & Recoil offsets
    this.weaponBasePos = new THREE.Vector3(0.28, -0.28, -0.6);
    this.recoilOffset = 0;
    this.swayTime = 0;
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (this.keys[e.code] !== undefined) {
        this.keys[e.code] = true;
      }
      if (e.code === 'KeyR' && !this.isReloading && this.ammo < this.maxAmmo) {
        this.reload();
      }
      // Prevent scrolling when pressing arrow keys or space bar
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys[e.code] !== undefined) {
        this.keys[e.code] = false;
      }
    });

    // Optional pointer lock for mouse look
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.isDead) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked && !this.isDead) {
        const sens = 0.0022;
        this.yaw -= e.movementX * sens;
        this.pitch -= e.movementY * sens;
        this.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.pitch));
      }
    });

    // Mouse click shooting
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });
  }

  reload() {
    if (this.isReloading || this.ammo >= this.maxAmmo) return;
    this.isReloading = true;
    this.reloadProgress = 0;
    sounds.playReload();
  }

  shoot(onPlayerShoot) {
    if (this.isDead || this.isReloading) return;

    if (this.ammo <= 0) {
      this.reload();
      return;
    }

    if (this.timeSinceLastShot < this.fireCooldown) return;

    this.timeSinceLastShot = 0;
    this.ammo--;
    this.recoilOffset = 0.08;
    this.muzzleLight.intensity = 5.0;

    sounds.playPlayerShoot();

    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.updateMatrixWorld();

    // Shoot vector straight from center of crosshair / camera
    const shootDir = new THREE.Vector3();
    this.camera.getWorldDirection(shootDir);

    // Muzzle world position
    const origin = new THREE.Vector3();
    this.weaponGroup.getWorldPosition(origin);
    origin.addScaledVector(shootDir, 0.4);

    if (onPlayerShoot) {
      onPlayerShoot({
        origin,
        direction: shootDir,
        speed: this.bulletSpeed,
        damage: this.damage,
        isEnemy: false
      });
    }

    if (this.ammo <= 0) {
      this.reload();
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.timeSinceDamaged = 0;

    // Damage shield first
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }

    if (amount > 0) {
      this.hp -= amount;
      sounds.playPlayerHurt();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      sounds.playDefeat();
    }
  }

  update(delta, onPlayerShoot) {
    if (this.isDead) return;

    this.timeSinceLastShot += delta;
    this.timeSinceDamaged += delta;

    // Shield passive regeneration if not damaged for 4 seconds
    if (this.timeSinceDamaged > 4.0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 18 * delta);
    }

    // Reload handling
    if (this.isReloading) {
      this.reloadProgress += delta / this.reloadDuration;
      if (this.reloadProgress >= 1.0) {
        this.ammo = this.maxAmmo;
        this.isReloading = false;
        this.reloadProgress = 0;
      }
    }

    // Space bar or Left mouse click to shoot
    if ((this.keys.Space || this.isMouseDown) && !this.isReloading) {
      this.shoot(onPlayerShoot);
    }

    // --- Arrow Keys & Keyboard Movement & Turning ---
    // Arrow Left / Right turns the camera horizontally!
    if (this.keys.ArrowLeft) {
      this.yaw += this.turnSpeed * delta;
    }
    if (this.keys.ArrowRight) {
      this.yaw -= this.turnSpeed * delta;
    }

    // Update Camera Euler
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Movement vectors based on camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveVector = new THREE.Vector3();

    // Arrow Up / Down moves Forward / Back
    if (this.keys.ArrowUp || this.keys.KeyW) {
      moveVector.add(forward);
    }
    if (this.keys.ArrowDown || this.keys.KeyS) {
      moveVector.sub(forward);
    }

    // A / D strafes Left / Right
    if (this.keys.KeyA) {
      moveVector.sub(right);
    }
    if (this.keys.KeyD) {
      moveVector.add(right);
    }

    const isMoving = moveVector.lengthSq() > 0.001;
    if (isMoving) {
      moveVector.normalize();
      const moveStep = moveVector.multiplyScalar(this.walkSpeed * delta);
      const nextPos = this.position.clone().add(moveStep);

      // Arena collision
      const col = this.arena.checkCollision(nextPos, this.radius);
      this.position.copy(col.correctedPos);

      // Weapon sway while walking
      this.swayTime += delta * 10;
      const swayX = Math.sin(this.swayTime) * 0.015;
      const swayY = Math.abs(Math.cos(this.swayTime)) * 0.012;
      this.weaponGroup.position.set(
        this.weaponBasePos.x + swayX,
        this.weaponBasePos.y + swayY - this.recoilOffset,
        this.weaponBasePos.z + this.recoilOffset * 0.8
      );
    } else {
      // Idle gentle breathing sway
      this.swayTime += delta * 2;
      const breathY = Math.sin(this.swayTime) * 0.004;
      this.weaponGroup.position.set(
        this.weaponBasePos.x,
        this.weaponBasePos.y + breathY - this.recoilOffset,
        this.weaponBasePos.z + this.recoilOffset * 0.8
      );
    }

    // Recoil recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - delta * 0.6);
    }

    // Muzzle light decay
    if (this.muzzleLight.intensity > 0) {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - delta * 30);
    }

    // Apply player position to camera
    this.camera.position.copy(this.position);
  }

  reset() {
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.ammo = this.maxAmmo;
    this.isDead = false;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.timeSinceDamaged = 0;
    this.position.set(0, 1.6, 18);
    this.yaw = 0;
    this.pitch = 0;
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0);
  }
}
