// Club definitions — pure data, no dependencies
const CLUBS = {
  driver: {
    name: 'Driver',
    shortName: 'DR',
    maxDistance: 280,   // yards (units)
    launchAngle: 12,    // degrees
    spread: 0.055,      // max lateral error as fraction of distance
    rollFactor: 0.10,   // rollDist = power * maxDistance * rollFactor
  },
  iron7: {
    name: '7 Iron',
    shortName: '7i',
    maxDistance: 155,
    launchAngle: 22,
    spread: 0.07,
    rollFactor: 0.05,
  },
  wedge: {
    name: 'P. Wedge',
    shortName: 'PW',
    maxDistance: 100,
    launchAngle: 40,
    spread: 0.065,
    rollFactor: 0.015,  // high loft = backspin, very little roll
  },
  putter: {
    name: 'Putter',
    shortName: 'PT',
    maxDistance: 25,
    launchAngle: 2,
    spread: 0.015,
    rollFactor: 0,      // the putt itself is a roll — no extra rollout needed
  },
};

const CLUB_ORDER = ['driver', 'iron7', 'wedge', 'putter'];
