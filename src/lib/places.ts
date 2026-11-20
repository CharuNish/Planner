// Rough map positions [latitude, longitude] for places you might want to visit.
// Add more if a travel goal doesn't show on the globe.
export const PLACES: Record<string, [number, number]> = {
  "sri lanka": [7.87, 80.77], japan: [36.2, 138.25], tokyo: [35.68, 139.69], kyoto: [35.01, 135.77], korea: [36.5, 127.9], seoul: [37.57, 126.98],
  china: [35.86, 104.2], "hong kong": [22.32, 114.17], taiwan: [23.7, 121], singapore: [1.35, 103.82], malaysia: [4.21, 101.98], thailand: [15.87, 100.99],
  bali: [-8.34, 115.09], indonesia: [-0.79, 113.92], vietnam: [14.06, 108.28], philippines: [12.88, 121.77], maldives: [3.2, 73.22], india: [20.59, 78.96],
  nepal: [28.39, 84.12], bhutan: [27.51, 90.43], dubai: [25.2, 55.27], "abu dhabi": [24.45, 54.38], uae: [23.42, 53.85], qatar: [25.35, 51.18], turkey: [38.96, 35.24],
  istanbul: [41.01, 28.98], egypt: [26.82, 30.8], morocco: [31.79, -7.09], kenya: [-0.02, 37.91], "south africa": [-30.56, 22.94], tanzania: [-6.37, 34.89],
  australia: [-25.27, 133.78], sydney: [-33.87, 151.21], melbourne: [-37.81, 144.96], "new zealand": [-40.9, 174.89],
  uk: [55.38, -3.44], "united kingdom": [55.38, -3.44], england: [52.36, -1.17], london: [51.51, -0.13], scotland: [56.49, -4.2], ireland: [53.41, -8.24],
  france: [46.23, 2.21], paris: [48.86, 2.35], italy: [41.87, 12.57], rome: [41.9, 12.5], venice: [45.44, 12.32], spain: [40.46, -3.75], barcelona: [41.39, 2.17],
  portugal: [39.4, -8.22], germany: [51.17, 10.45], berlin: [52.52, 13.4], munich: [48.14, 11.58], netherlands: [52.13, 5.29], amsterdam: [52.37, 4.9],
  belgium: [50.5, 4.47], switzerland: [46.82, 8.23], zurich: [47.38, 8.54], lausanne: [46.52, 6.63], austria: [47.52, 14.55], vienna: [48.21, 16.37],
  "czech": [49.82, 15.47], prague: [50.08, 14.44], hungary: [47.16, 19.5], budapest: [47.5, 19.04], poland: [51.92, 19.15], greece: [39.07, 21.82], santorini: [36.39, 25.46],
  croatia: [45.1, 15.2], bulgaria: [42.73, 25.49], sofia: [42.7, 23.32], norway: [60.47, 8.47], sweden: [60.13, 18.64], finland: [61.92, 25.75], denmark: [56.26, 9.5],
  iceland: [64.96, -19.02], russia: [61.52, 105.32], usa: [37.09, -95.71], "united states": [37.09, -95.71], america: [37.09, -95.71], "new york": [40.71, -74.01],
  california: [36.78, -119.42], "san francisco": [37.77, -122.42], "los angeles": [34.05, -118.24], hawaii: [19.9, -155.58], canada: [56.13, -106.35],
  toronto: [43.65, -79.38], vancouver: [49.28, -123.12], mexico: [23.63, -102.55], brazil: [-14.24, -51.93], peru: [-9.19, -75.02], argentina: [-38.42, -63.62], chile: [-35.68, -71.54],
  "northern lights": [69.65, 18.96], everest: [27.99, 86.93], "machu picchu": [-13.16, -72.55],
};

export function placeIn(text: string): { name: string; coords: [number, number] } | null {
  const t = text.toLowerCase();
  // Prefer longer names first ("new york" before "york")
  for (const name of Object.keys(PLACES).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${name}\\b`).test(t)) return { name, coords: PLACES[name] };
  }
  return null;
}
