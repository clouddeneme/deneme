// Scene timing (seconds). The whole film is a pure function of t in [0, DURATION].
export const DURATION = 75;
export const FPS = 30;

export const T = {
  type0: 1.0, typeStep: 0.3,        // "29.10.1923" typed on a terminal
  burst: 5.6,                        // digits turn into embers
  mapIn: 13.0, mapDone: 16.2,        // embers gather into Türkiye
  izmitIn: 18.0, izmitOut: 25.0,     // camera on İzmit: 1921, 1923
  wave: 25.3,                        // 29 Ekim 1923, light wave from Ankara
  letters: 28.4, lettersOut: 31.4,   // 1928 alphabet
  rail: 32.0,                        // 1930s railways
  vote: 35.0,                        // 1934
  paper: 37.5,                       // 1936 İzmit paper
  tower: 40.0, dial: 47.0, years0: 48.0, years1: 52.8,
  flag: 54.0, fireworks: 56.0,
  quote: 65.0, end: 71.0,
};

// Places in map units (from geo.json, duplicated here for camera framing).
export const IZMIT = [-4.04, 1.77];
export const ANKARA = [-1.83, 0.93];

export const TOWER_X = 200;   // tower scene sits far from the map
export const PAPER_X = -200;
