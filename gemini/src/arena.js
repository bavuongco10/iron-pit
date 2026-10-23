import * as THREE from 'three';

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.size = 64; // 64x64 arena
    this.halfSize = this.size / 2;
    this.colliders = []; // Array of { box: THREE.Box3, mesh: THREE.Mesh }

    this.createFloor();
    this.createWalls();
    this.createObstacles();
    this.createLighting();
    this.createAtmosphere();
  }

  createFloor() {
    // High-tech sci-fi grid floor
    const floorGeo = new THREE.PlaneGeometry(this.size, this.size, 32, 32);
    
    // Canvas texture for high-tech grid
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Background dark metallic metal
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 1024);

    // Grid tiles
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    const tileSize = 64;
    for (let x = 0; x <= 1024; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Center combat circle
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(512, 512, 280, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(512, 512, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Cross markings in center
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(480, 512); ctx.lineTo(544, 512);
    ctx.moveTo(512, 480); ctx.lineTo(512, 544);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const floorMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.65,
      metalness: 0.4
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Glowing border line around arena floor
    const borderGeo = new THREE.RingGeometry(this.halfSize - 0.5, this.halfSize, 64);
    // Or rectangular border
    const borderEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(this.size, 0.2, this.size));
    const borderLine = new THREE.LineSegments(borderEdges, new THREE.LineBasicMaterial({ color: 0x00f0ff }));
    borderLine.position.y = 0.05;
    this.scene.add(borderLine);
  }

  createWalls() {
    const wallHeight = 8;
    const wallThickness = 2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e2230,
      roughness: 0.8,
      metalness: 0.3
    });

    const trimMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4
    });

    const createWallSegment = (width, depth, x, z, rotY = 0) => {
      const geo = new THREE.BoxGeometry(width, wallHeight, depth);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, wallHeight / 2, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Add neon strip along top edge of wall
      const stripGeo = new THREE.BoxGeometry(width, 0.2, depth + 0.1);
      const strip = new THREE.Mesh(stripGeo, trimMat);
      strip.position.set(x, wallHeight - 0.2, z);
      strip.rotation.y = rotY;
      this.scene.add(strip);

      const box = new THREE.Box3().setFromObject(mesh);
      this.colliders.push({ box, mesh });
    };

    // North wall
    createWallSegment(this.size, wallThickness, 0, -this.halfSize);
    // South wall
    createWallSegment(this.size, wallThickness, 0, this.halfSize);
    // West wall
    createWallSegment(wallThickness, this.size, -this.halfSize, 0);
    // East wall
    createWallSegment(wallThickness, this.size, this.halfSize, 0);
  }

  createObstacles() {
    const obstacleMat = new THREE.MeshStandardMaterial({
      color: 0x242c3d,
      roughness: 0.7,
      metalness: 0.5
    });

    const glowCoreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8
    });

    const redHazardMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.5
    });

    // 1. Central Core Pillar (Provides key cover in center)
    const pillarGeo = new THREE.CylinderGeometry(2.5, 3.2, 7, 8);
    const centerPillar = new THREE.Mesh(pillarGeo, obstacleMat);
    centerPillar.position.set(0, 3.5, 0);
    centerPillar.castShadow = true;
    centerPillar.receiveShadow = true;
    this.scene.add(centerPillar);

    // Glowing core ring around center pillar
    const ringGeo = new THREE.TorusGeometry(3.1, 0.25, 16, 32);
    const ringMesh = new THREE.Mesh(ringGeo, glowCoreMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0, 3.5, 0);
    this.scene.add(ringMesh);

    this.colliders.push({
      box: new THREE.Box3().setFromObject(centerPillar),
      mesh: centerPillar
    });

    // 2. Corner tactical energy bunkers / crates
    const crateLocations = [
      { x: -14, z: -14, w: 4, h: 3.5, d: 4 },
      { x: 14, z: -14, w: 4, h: 3.5, d: 4 },
      { x: -14, z: 14, w: 4, h: 3.5, d: 4 },
      { x: 14, z: 14, w: 4, h: 3.5, d: 4 },

      // Perimeter flanking barriers
      { x: 0, z: -20, w: 8, h: 3.0, d: 2 },
      { x: 0, z: 20, w: 8, h: 3.0, d: 2 },
      { x: -20, z: 0, w: 2, h: 3.0, d: 8 },
      { x: 20, z: 0, w: 2, h: 3.0, d: 8 },
    ];

    crateLocations.forEach((c) => {
      const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
      const mesh = new THREE.Mesh(geo, obstacleMat);
      mesh.position.set(c.x, c.h / 2, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Add accent light strip on top of cover
      const accentGeo = new THREE.BoxGeometry(c.w * 0.8, 0.15, c.d * 0.8);
      const accent = new THREE.Mesh(accentGeo, (c.x * c.z > 0) ? glowCoreMat : redHazardMat);
      accent.position.set(c.x, c.h + 0.05, c.z);
      this.scene.add(accent);

      this.colliders.push({
        box: new THREE.Box3().setFromObject(mesh),
        mesh
      });
    });

    // 4 Corner watchtowers/spires with spotlights
    const spireCoords = [
      [-26, -26], [26, -26], [-26, 26], [26, 26]
    ];
    spireCoords.forEach(([sx, sz]) => {
      const spireGeo = new THREE.CylinderGeometry(1.2, 1.8, 12, 6);
      const spire = new THREE.Mesh(spireGeo, obstacleMat);
      spire.position.set(sx, 6, sz);
      spire.castShadow = true;
      this.scene.add(spire);

      // Beacon light
      const beaconGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      beacon.position.set(sx, 12.2, sz);
      this.scene.add(beacon);

      const beaconLight = new THREE.PointLight(0x38bdf8, 1.2, 25);
      beaconLight.position.set(sx, 12.5, sz);
      this.scene.add(beaconLight);

      this.colliders.push({
        box: new THREE.Box3().setFromObject(spire),
        mesh: spire
      });
    });
  }

  createLighting() {
    // Ambient light - deep sci-fi night tint
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8);
    this.scene.add(ambientLight);

    // Main moonlight / stadium floodlight
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.6);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    const d = 35;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // Center reactor glow
    const centerLight = new THREE.PointLight(0x06b6d4, 2.5, 20);
    centerLight.position.set(0, 4, 0);
    this.scene.add(centerLight);
  }

  createAtmosphere() {
    // Subtle sci-fi dust/plasma particles floating in the air
    const count = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.size;
      positions[i * 3 + 1] = Math.random() * 10 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.size;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  update(delta) {
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 0.4;
        if (positions[i] < 0.2) {
          positions[i] = 10;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Check collision for a sphere (e.g., player or enemy capsule)
  checkCollision(position, radius = 0.8) {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(position.x - radius, position.y, position.z - radius),
      new THREE.Vector3(position.x + radius, position.y + 1.8, position.z + radius)
    );

    // Check arena boundary walls
    const limit = this.halfSize - radius - 1.0;
    let collided = false;
    const correctedPos = position.clone();

    if (correctedPos.x > limit) { correctedPos.x = limit; collided = true; }
    if (correctedPos.x < -limit) { correctedPos.x = -limit; collided = true; }
    if (correctedPos.z > limit) { correctedPos.z = limit; collided = true; }
    if (correctedPos.z < -limit) { correctedPos.z = -limit; collided = true; }

    // Check obstacles
    for (const c of this.colliders) {
      if (playerBox.intersectsBox(c.box)) {
        collided = true;
        // Push out along minimal axis
        const box = c.box;
        const dx1 = Math.abs(position.x - box.min.x);
        const dx2 = Math.abs(position.x - box.max.x);
        const dz1 = Math.abs(position.z - box.min.z);
        const dz2 = Math.abs(position.z - box.max.z);
        const minD = Math.min(dx1, dx2, dz1, dz2);

        if (minD === dx1) correctedPos.x = box.min.x - radius;
        else if (minD === dx2) correctedPos.x = box.max.x + radius;
        else if (minD === dz1) correctedPos.z = box.min.z - radius;
        else correctedPos.z = box.max.z + radius;
      }
    }

    return { collided, correctedPos };
  }

  // Check ray intersection against obstacles (for line-of-sight checks)
  checkLineOfSight(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    dir.normalize();

    const ray = new THREE.Ray(from, dir);
    const targetBox = new THREE.Box3();

    for (const c of this.colliders) {
      const intersect = ray.intersectBox(c.box, new THREE.Vector3());
      if (intersect) {
        const d = from.distanceTo(intersect);
        if (d < dist - 0.5) {
          return false; // Obstructed by wall or pillar
        }
      }
    }
    return true; // Clear line of sight
  }
}
