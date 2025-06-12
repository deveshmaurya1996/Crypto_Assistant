import axios from 'axios';
import { CryptoData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

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
    // Convert symbol to lowercase and get CoinGecko ID
    const symbolLower = symbol.toLowerCase();
    const coinId = SYMBOL_TO_ID[symbolLower] || symbolLower;
    
    console.log(`Fetching price for ${symbol} with ID: ${coinId}`);
    
    const response = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: coinId,
        sparkline: true
      }
    });
    
    return response.data[0] || null;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    throw error;
  }
};

export const searchCoinId = async (symbol: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { query: symbol }
    });
    
    if (response.data.coins && response.data.coins.length > 0) {
      return response.data.coins[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for coin:', error);
    return null;
  }
};

export const getTrendingCoins = async (): Promise<CryptoData[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'gecko_desc',
        per_page: 10,
        page: 1,
        sparkline: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    throw error;
  }
};

export const searchCrypto = async (query: string): Promise<CryptoData[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { query }
    });
    
    const coinIds = response.data.coins.slice(0, 5).map((coin: any) => coin.id).join(',');
    
    if (!coinIds) return [];
    
    const marketResponse = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: coinIds
      }
    });
    
    return marketResponse.data;
  } catch (error) {
    console.error('Error searching crypto:', error);
    throw error;
  }
};

