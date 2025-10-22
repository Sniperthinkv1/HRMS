// Location service for handling countries, states, and cities data
export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface State {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  state_id: number;
}

export interface CountryStateCityMapping {
  [countryId: string]: {
    name: string;
    code: string;
    states: State[];
  };
}

// Cache for loaded data
let countriesCache: Country[] | null = null;
let statesCache: State[] | null = null;
let citiesCache: City[] | null = null;
let mappingCache: CountryStateCityMapping | null = null;

// Load countries data
export const loadCountries = async (): Promise<Country[]> => {
  if (countriesCache) {
    return countriesCache;
  }

  try {
    const response = await fetch('/countries.json');
    const data = await response.json();
    countriesCache = data;
    return data;
  } catch (error) {
    console.error('Error loading countries:', error);
    return [];
  }
};

// Load states data
export const loadStates = async (): Promise<State[]> => {
  if (statesCache) {
    return statesCache;
  }

  try {
    const response = await fetch('/states.json');
    const data = await response.json();
    statesCache = data;
    return data;
  } catch (error) {
    console.error('Error loading states:', error);
    return [];
  }
};

// Load cities data with performance optimization
export const loadCities = async (): Promise<City[]> => {
  if (citiesCache) {
    return citiesCache;
  }

  try {
    console.log('🔄 Loading cities data...');
    const startTime = Date.now();
    // Use sample cities for testing - replace with '/cities.json' for full data
    const response = await fetch('/cities-sample.json');
    const data = await response.json();
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Cities loaded in ${loadTime}ms:`, {
      totalCities: data.length,
      sampleCities: data.slice(0, 3)
    });
    
    citiesCache = data;
    return data;
  } catch (error) {
    console.error('Error loading cities:', error);
    return [];
  }
};

// Load country-state-city mapping
export const loadCountryStateCityMapping = async (): Promise<CountryStateCityMapping> => {
  if (mappingCache) {
    return mappingCache;
  }

  try {
    const response = await fetch('/country-state-city-mapping.json');
    const data = await response.json();
    mappingCache = data;
    return data;
  } catch (error) {
    console.error('Error loading country-state-city mapping:', error);
    return {};
  }
};

// Get states for a specific country
export const getStatesByCountry = async (countryId: number): Promise<State[]> => {
  try {
    // For now, return all states from states.json
    // This is a simplified approach - in production you'd have proper country-state relationships
    const allStates = await loadStates();
    
    console.log(`🌍 States for country ${countryId}:`, {
      totalStates: allStates.length,
      sampleStates: allStates.slice(0, 5)
    });
    
    // For Afghanistan (country ID 1), return all states
    if (countryId === 1) {
      return allStates;
    }
    
    // For other countries, return a subset or empty array
    // You can expand this mapping as needed
    return allStates.slice(0, 50); // Limit to first 50 for performance
  } catch (error) {
    console.error('Error getting states by country:', error);
    return [];
  }
};

// Get cities for a specific state
export const getCitiesByState = async (stateId: number): Promise<City[]> => {
  try {
    const allCities = await loadCities();
    const filteredCities = allCities.filter(city => city.state_id === stateId);
    
    console.log(`🔍 Cities for state ${stateId}:`, {
      totalCities: allCities.length,
      filteredCount: filteredCities.length,
      sampleCities: filteredCities.slice(0, 5)
    });
    
    // Limit results to prevent performance issues
    return filteredCities.slice(0, 200);
  } catch (error) {
    console.error('Error getting cities by state:', error);
    return [];
  }
};

// Get all countries as dropdown options
export const getCountryOptions = async () => {
  const countries = await loadCountries();
  return countries.map(country => ({
    value: country.id.toString(),
    label: country.name
  }));
};

// Get states as dropdown options for a country
export const getStateOptions = async (countryId: number) => {
  const states = await getStatesByCountry(countryId);
  return states.map(state => ({
    value: state.id.toString(),
    label: state.name
  }));
};

// Get cities as dropdown options for a state
export const getCityOptions = async (stateId: number) => {
  const cities = await getCitiesByState(stateId);
  return cities.map(city => ({
    value: city.id.toString(),
    label: city.name
  }));
};

// Clear cache (useful for development)
export const clearLocationCache = () => {
  countriesCache = null;
  statesCache = null;
  citiesCache = null;
  mappingCache = null;
};
