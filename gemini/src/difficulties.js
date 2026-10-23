export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    name: 'Recruit',
    badge: 'LVL 1 - RECRUIT',
    color: '#00ffaa',
    enemyHp: 80,
    enemySpeed: 4.0,
    shootCooldown: 2.2, // seconds between shots
    accuracy: 0.45, // hit probability / bullet spread
    reactionDelay: 1.0, // seconds before locking on
    damagePerHit: 10,
    bulletSpeed: 24,
    shieldRegen: 0,
    description: 'Sluggish enemy with lower armor and broad weapon spread. Good for target practice.',
    stats: {
      health: 'Low (80 HP)',
      speed: 'Slow (4.0 m/s)',
      accuracy: '45% Spread',
      fireRate: 'Low (2.2s)'
    }
  },
  medium: {
    id: 'medium',
    name: 'Soldier',
    badge: 'LVL 2 - SOLDIER',
    color: '#38bdf8',
    enemyHp: 150,
    enemySpeed: 6.2,
    shootCooldown: 1.3,
    accuracy: 0.72,
    reactionDelay: 0.5,
    damagePerHit: 15,
    bulletSpeed: 30,
    shieldRegen: 0,
    description: 'Trained combat drone with tactical strafing, cover usage, and moderate burst fire.',
    stats: {
      health: 'Medium (150 HP)',
      speed: 'Normal (6.2 m/s)',
      accuracy: '72% Precision',
      fireRate: 'Medium (1.3s)'
    }
  },
  hard: {
    id: 'hard',
    name: 'Veteran',
    badge: 'LVL 3 - VETERAN',
    color: '#fbbf24',
    enemyHp: 240,
    enemySpeed: 8.5,
    shootCooldown: 0.85,
    accuracy: 0.88,
    reactionDelay: 0.25,
    damagePerHit: 20,
    bulletSpeed: 38,
    shieldRegen: 0,
    description: 'Aggressive cyber-hunter with high strafing agility, rapid firing, and tactical flanking.',
    stats: {
      health: 'High (240 HP)',
      speed: 'Fast (8.5 m/s)',
      accuracy: '88% Precision',
      fireRate: 'High (0.85s)'
    }
  },
  nightmare: {
    id: 'nightmare',
    name: 'Nightmare',
    badge: 'LVL 4 - APEX BOSS',
    color: '#f43f5e',
    enemyHp: 380,
    enemySpeed: 10.5,
    shootCooldown: 0.55,
    accuracy: 0.96,
    reactionDelay: 0.12,
    damagePerHit: 25,
    bulletSpeed: 45,
    shieldRegen: 15, // regens 15 hp/s if player doesn't hit for 3.5s
    description: 'Relentless apex mechanical warlord. Armed with dual burst plasma, thruster dashes, and regenerative shields.',
    stats: {
      health: 'Boss (380 HP + Regen)',
      speed: 'Hyper (10.5 m/s)',
      accuracy: '96% Pinpoint',
      fireRate: 'Barrage (0.55s)'
    }
  }
};
