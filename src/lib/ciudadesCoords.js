// Coordenadas aproximadas (lat, lon) de ciudades usadas con frecuencia en giras MX/USA.
const COORDS = {
  'MEXICALI': [32.6245, -115.4523],
  'TIJUANA': [32.5149, -117.0382],
  'ENSENADA': [31.8667, -116.6],
  'CD JUAREZ': [31.6904, -106.4245],
  'CIUDAD JUAREZ': [31.6904, -106.4245],
  'CHIHUAHUA': [28.6353, -106.0889],
  'HERMOSILLO': [29.0729, -110.9559],
  'CULIACAN': [24.8091, -107.394],
  'MAZATLAN': [23.2494, -106.411],
  'DURANGO': [24.0277, -104.6532],
  'TORREON': [25.5428, -103.4068],
  'SALTILLO': [25.4232, -101.0053],
  'MONTERREY': [25.6866, -100.3161],
  'MTY': [25.6866, -100.3161],
  'REYNOSA': [26.0922, -98.2854],
  'MATAMOROS': [25.8697, -97.5027],
  'NUEVO LAREDO': [27.4849, -99.5064],
  'SAN LUIS POTOSI': [22.1565, -100.9855],
  'AGUASCALIENTES': [21.8853, -102.2916],
  'GUADALAJARA': [20.6597, -103.3496],
  'GDL': [20.6597, -103.3496],
  'LEON': [21.1619, -101.6834],
  'QUERETARO': [20.5888, -100.3899],
  'MORELIA': [19.7008, -101.1844],
  'TOLUCA': [19.2926, -99.6568],
  'CDMX': [19.4326, -99.1332],
  'CIUDAD DE MEXICO': [19.4326, -99.1332],
  'MEXICO': [19.4326, -99.1332],
  'PUEBLA': [19.0414, -98.2063],
  'VERACRUZ': [19.1738, -96.1342],
  'OAXACA': [17.0732, -96.7266],
  'CANCUN': [21.1619, -86.8515],
  'MERIDA': [20.9674, -89.5926],
  'ACAPULCO': [16.8531, -99.8237],
  'TAMPICO': [22.2331, -97.8614],
  'XALAPA': [19.5438, -96.9102],
  'VILLAHERMOSA': [17.9892, -92.9281],
  'TUXTLA GUTIERREZ': [16.7516, -93.1161],
  'LOS ANGELES': [34.0522, -118.2437],
  'SAN DIEGO': [32.7157, -117.1611],
  'LAS VEGAS': [36.1699, -115.1398],
  'PHOENIX': [33.4484, -112.074],
  'TUCSON': [32.2226, -110.9747],
  'EL PASO': [31.7619, -106.485],
  'AUSTIN': [30.2672, -97.7431],
  'SAN ANTONIO': [29.4241, -98.4936],
  'HOUSTON': [29.7604, -95.3698],
  'DALLAS': [32.7767, -96.797],
  'FORT WORTH': [32.7555, -97.3308],
  'OKLAHOMA CITY': [35.4676, -97.5164],
  'ALBUQUERQUE': [35.0844, -106.6504],
  'DENVER': [39.7392, -104.9903],
  'SACRAMENTO': [38.5816, -121.4944],
  'SAN FRANCISCO': [37.7749, -122.4194],
  'CHICAGO': [41.8781, -87.6298],
  'MIAMI': [25.7617, -80.1918],
  'ATLANTA': [33.749, -84.388],
  'NEW YORK': [40.7128, -74.006],
  'ORLANDO': [28.5383, -81.3792],
};

const CIUDADES_MX = new Set([
  'MEXICALI', 'TIJUANA', 'ENSENADA', 'CD JUAREZ', 'CIUDAD JUAREZ', 'CHIHUAHUA', 'HERMOSILLO',
  'CULIACAN', 'MAZATLAN', 'DURANGO', 'TORREON', 'SALTILLO', 'MONTERREY', 'MTY', 'REYNOSA',
  'MATAMOROS', 'NUEVO LAREDO', 'SAN LUIS POTOSI', 'AGUASCALIENTES', 'GUADALAJARA', 'GDL',
  'LEON', 'QUERETARO', 'MORELIA', 'TOLUCA', 'CDMX', 'CIUDAD DE MEXICO', 'MEXICO', 'PUEBLA',
  'VERACRUZ', 'OAXACA', 'CANCUN', 'MERIDA', 'ACAPULCO', 'TAMPICO', 'XALAPA', 'VILLAHERMOSA',
  'TUXTLA GUTIERREZ',
]);

function normalizar(nombre) {
  return (nombre || '')
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function coordsDeCiudad(nombre) {
  return COORDS[normalizar(nombre)] || null;
}

export function paisDeCiudad(nombre) {
  const key = normalizar(nombre);
  if (!COORDS[key]) return null;
  return CIUDADES_MX.has(key) ? 'MX' : 'US';
}
