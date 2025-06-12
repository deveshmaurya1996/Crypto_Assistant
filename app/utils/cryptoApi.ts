import axios from 'axios';
import { CryptoData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const TIMEOUT = 30000;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

const retryRequest = async (fn: () => Promise<any>, retries = MAX_RETRIES): Promise<any> => {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries > 0) {
      const isNetworkError = 
        (axios.isAxiosError(error) && 
          (error.code === 'ECONNABORTED' || 
           error.message === 'Network Error' ||
           error.response?.status === 429)) ||
        (error instanceof Error && error.message === 'Network Error');

      if (isNetworkError) {
        const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
        console.log(`Retrying request in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryRequest(fn, retries - 1);
      }
    }
    throw error;
  }
};

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000;

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
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
  try {
    const symbolLower = symbol.toLowerCase();
    const coinId = SYMBOL_TO_ID[symbolLower] || symbolLower;
    
    const cacheKey = `price_${coinId}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`Using cached price data for ${symbol}`);
      return cachedData;
    }
    
    console.log(`Fetching price for ${symbol} with ID: ${coinId}`);
    
    const response = await retryRequest(() => 
      api.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinId,
          sparkline: true
        }
      })
    );
    
    const data = response.data[0] || null;
    if (data) {
      setCachedData(cacheKey, data);
    }
    return data;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    const cacheKey = `price_${symbol.toLowerCase()}`;
    const cachedData = cache.get(cacheKey)?.data;
    if (cachedData) {
      console.log(`Using expired cached data for ${symbol} due to error`);
      return cachedData;
    }
    throw error;
  }
};

export const searchCoinId = async (symbol: string): Promise<string | null> => {
  try {
    const cacheKey = `search_${symbol}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const response = await retryRequest(() =>
      api.get('/search', {
        params: { query: symbol }
      })
    );
    
    if (response.data.coins && response.data.coins.length > 0) {
      const result = response.data.coins[0].id;
      setCachedData(cacheKey, result);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for coin:', error);
    return null;
  }
};

export const getTrendingCoins = async (): Promise<CryptoData[]> => {
  try {
    const cacheKey = 'trending';
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const response = await retryRequest(() =>
      api.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'gecko_desc',
          per_page: 10,
          page: 1,
          sparkline: true
        }
      })
    );
    
    const data = response.data;
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    const cachedData = cache.get('trending')?.data;
    if (cachedData) {
      console.log('Using cached trending data due to error');
      return cachedData;
    }
    throw error;
  }
};

export const searchCrypto = async (query: string): Promise<CryptoData[]> => {
  try {
    const cacheKey = `search_crypto_${query}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const response = await retryRequest(() =>
      api.get('/search', {
        params: { query }
      })
    );
    
    const coinIds = response.data.coins.slice(0, 5).map((coin: any) => coin.id).join(',');
    
    if (!coinIds) return [];
    
    const marketResponse = await retryRequest(() =>
      api.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinIds
        }
      })
    );
    
    const data = marketResponse.data;
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error searching crypto:', error);
    const cachedData = cache.get(`search_crypto_${query}`)?.data;
    if (cachedData) {
      console.log('Using cached search data due to error');
      return cachedData;
    }
    throw error;
  }
};

