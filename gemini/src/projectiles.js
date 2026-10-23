import * as THREE from 'three';
import { sounds } from './audio.js';

export class ProjectileManager {
  constructor(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.projectiles = [];
    this.sparks = [];

    // Reusable geometries & materials for efficiency
    this.playerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
    this.playerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    this.enemyGeo = new THREE.SphereGeometry(0.18, 12, 12);
    this.enemyMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    this.sparkMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  }

  spawn(params) {
    const { origin, direction, speed, damage, isEnemy } = params;

    let mesh;
    if (isEnemy) {
      mesh = new THREE.Mesh(this.enemyGeo, this.enemyMat);
      mesh.position.copy(origin);
    } else {
      mesh = new THREE.Mesh(this.playerGeo, this.playerMat);
      mesh.position.copy(origin);
      // Align cylinder with travel direction
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    }

    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      velocity: direction.clone().multiplyScalar(speed),
      damage,
      isEnemy,
      life: 3.0 // seconds before despawn
    });
  }

  createImpactSparks(position, color = 0x38bdf8, count = 16) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.2) * 8,
          (Math.random() - 0.5) * 8
        )
      );
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.15,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.sparks.push({ points, velocities, life: 0.35, maxLife: 0.35 });
  }

  update(delta, player, enemy, onPlayerHitEnemy, onEnemyHitPlayer) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      const prevPos = p.mesh.position.clone();
      p.mesh.position.addScaledVector(p.velocity, delta);
      const currentPos = p.mesh.position;

      let remove = false;

      if (p.life <= 0) {
        remove = true;
      }

      // Check collision with arena walls / obstacles
      if (!remove) {
        const rayDir = new THREE.Vector3().subVectors(currentPos, prevPos);
        const dist = rayDir.length();
        rayDir.normalize();

        const ray = new THREE.Ray(prevPos, rayDir);
        for (const c of this.arena.colliders) {
          const hit = ray.intersectBox(c.box, new THREE.Vector3());
          if (hit && prevPos.distanceTo(hit) <= dist) {
            this.createImpactSparks(hit, p.isEnemy ? 0xff4400 : 0x00f0ff, 12);
            remove = true;
            break;
          }
        }
      }

      // Check floor boundary
      if (!remove && currentPos.y <= 0.05) {
        this.createImpactSparks(currentPos, p.isEnemy ? 0xff4400 : 0x00f0ff, 10);
        remove = true;
      }

      // Player projectile vs Enemy
      if (!remove && !p.isEnemy && !enemy.isDead) {
        const enemyCenter = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        const dist = currentPos.distanceTo(enemyCenter);

        if (dist < 1.3) {
          enemy.takeDamage(p.damage);
          this.createImpactSparks(currentPos, 0xff0044, 20);
          sounds.playHitmarker();
          if (onPlayerHitEnemy) onPlayerHitEnemy(p.damage);
          remove = true;
        }
      }

      // Enemy projectile vs Player
      if (!remove && p.isEnemy && !player.isDead) {
        const playerCenter = player.position.clone().add(new THREE.Vector3(0, 0, 0));
        const dist = currentPos.distanceTo(playerCenter);

        if (dist < 1.0) {
          player.takeDamage(p.damage);
          this.createImpactSparks(currentPos, 0xff3300, 20);
          if (onEnemyHitPlayer) onEnemyHitPlayer(p.damage);
          remove = true;
        }
      }

      if (remove) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= delta;
      s.points.material.opacity = Math.max(0, s.life / s.maxLife);

      const positions = s.points.geometry.attributes.position.array;
      for (let j = 0; j < s.velocities.length; j++) {
        const vel = s.velocities[j];
        vel.y -= 18 * delta; // Gravity
        positions[j * 3] += vel.x * delta;
        positions[j * 3 + 1] += vel.y * delta;
        positions[j * 3 + 2] += vel.z * delta;
      }
      s.points.geometry.attributes.position.needsUpdate = true;

      if (s.life <= 0) {
        this.scene.remove(s.points);
        this.sparks.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];

    for (const s of this.sparks) {
      this.scene.remove(s.points);
    }
    this.sparks = [];
  }
}
