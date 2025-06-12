import axios, { AxiosInstance } from 'axios';
import { CryptoData } from '../types';

interface ApiError extends Error {
  response?: {
    status: number;
    data: unknown;
  };
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
  };
}

interface SearchCoin {
  id: string;
  name: string;
  symbol: string;
}

const CACHE_DURATION = 60000; // 1 minute
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const TIMEOUT = 30000;

const api: AxiosInstance = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const cache = new Map<string, CacheEntry>();

const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    const apiError = error as ApiError;
    if (retries > 0 && (
      apiError.message === 'Network Error' ||
      apiError.message.includes('timeout') ||
      (apiError.response?.status && apiError.response.status >= 500)
    )) {
      console.log(`Retrying... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

const getCachedData = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  cache.delete(key); // Clean up expired cache
  return null;
};

const setCachedData = <T>(key: string, data: T): void => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const SYMBOL_TO_ID: { [key: string]: string } = {
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'bnb': 'binancecoin',
  'sol': 'solana',
  'ada': 'cardano',
  'doge': 'dogecoin',
  'xrp': 'ripple',
  'dot': 'polkadot',
  'matic': 'matic-network',
  'link': 'chainlink',
  'ltc': 'litecoin',
  'avax': 'avalanche-2',
  'uni': 'uniswap',
  'atom': 'cosmos',
  'etc': 'ethereum-classic',
  'xlm': 'stellar',
  'near': 'near',
  'algo': 'algorand',
  'vet': 'vechain',
  'ftm': 'fantom',
  'hbar': 'hedera',
  'mana': 'decentraland',
  'sand': 'the-sandbox',
  'axs': 'axie-infinity',
  'shib': 'shiba-inu',
  'siba': 'shiba-inu',
};

export const getCryptoPrice = async (symbol: string): Promise<CryptoData | null> => {
  // Convert symbol to lowercase and get CoinGecko ID
  const symbolLower = symbol.toLowerCase();
  const coinId = SYMBOL_TO_ID[symbolLower] || symbolLower;
  
  const cacheKey = `price-${coinId}`;
  const cachedData = getCachedData<CryptoData>(cacheKey);
  
  if (cachedData) {
    console.log(`Using cached data for ${coinId}`);
    return cachedData;
  }

  try {
    const response = await retryRequest(() => 
      api.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinId,
          sparkline: true,
          price_change_percentage: '24h'
        }
      })
    );
    
    if (response.data && response.data.length > 0) {
      const cryptoData = response.data[0];
      setCachedData(cacheKey, cryptoData);
      return cryptoData;
    }
    return null;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.response?.status === 429) {
      console.error('Rate limit exceeded');
      // Return cached data if available
      const fallbackCache = getCachedData<CryptoData>(cacheKey);
      if (fallbackCache) {
        return fallbackCache;
      }
    }
    console.error('Error fetching crypto price:', error);
    return null;
  }
};

export const searchCoinId = async (symbol: string): Promise<string | null> => {
  const cacheKey = `search-${symbol}`;
  const cachedData = getCachedData<string>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await retryRequest(() => 
      api.get('/search', {
        params: { query: symbol }
      })
    );
    
    if (response.data.coins && response.data.coins.length > 0) {
      const coinId = response.data.coins[0].id;
      setCachedData(cacheKey, coinId);
      return coinId;
    }
    return null;
  } catch (error) {
    console.error('Error searching coin:', error);
    return null;
  }
};

export const getTrendingCoins = async (): Promise<CryptoData[]> => {
  const cacheKey = 'trending';
  const cachedData = getCachedData<CryptoData[]>(cacheKey);
  
  if (cachedData) {
    console.log('Using cached trending data');
    return cachedData;
  }

  try {
    // Get trending coins first
    const trendingResponse = await retryRequest(() => 
      api.get<{ coins: TrendingCoin[] }>('/search/trending')
    );
    
    if (!trendingResponse.data.coins || trendingResponse.data.coins.length === 0) {
      return [];
    }
    
    // Extract coin IDs from trending response
    const coinIds = trendingResponse.data.coins
      .slice(0, 10)
      .map(coin => coin.item.id)
      .join(',');
    
    // Get market data for trending coins
    const marketResponse = await retryRequest(() => 
      api.get<CryptoData[]>('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinIds,
          sparkline: false,
          price_change_percentage: '24h'
        }
      })
    );
    
    setCachedData(cacheKey, marketResponse.data);
    return marketResponse.data;
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    return getCachedData<CryptoData[]>(cacheKey) || [];
  }
};

export const searchCrypto = async (query: string): Promise<CryptoData[]> => {
  const cacheKey = `search-crypto-${query}`;
  const cachedData = getCachedData<CryptoData[]>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  try {
    // First search for coins
    const searchResponse = await retryRequest(() => 
      api.get<{ coins: SearchCoin[] }>('/search', {
        params: { query }
      })
    );
    
    if (!searchResponse.data.coins || searchResponse.data.coins.length === 0) {
      return [];
    }
    
    // Get top 5 coin IDs from search results
    const coinIds = searchResponse.data.coins
      .slice(0, 5)
      .map(coin => coin.id)
      .join(',');
    
    // Get market data for searched coins
    const marketResponse = await retryRequest(() => 
      api.get<CryptoData[]>('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinIds,
          sparkline: false,
          price_change_percentage: '24h'
        }
      })
    );
    
    setCachedData(cacheKey, marketResponse.data);
    return marketResponse.data;
  } catch (error) {
    console.error('Error searching crypto:', error);
    return getCachedData<CryptoData[]>(cacheKey) || [];
  }
};

// Clear expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  });
}, CACHE_DURATION);