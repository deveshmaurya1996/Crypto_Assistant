export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
  type?: 'text' | 'chart' | 'portfolio';
  chartData?: {
    data: number[];
    symbol: string;
  };
  portfolioData?: {
    portfolio: Portfolio;
    prices: { [symbol: string]: CryptoData };
  };
}

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
  image: string;
  sparkline_in_7d?: {
    price: number[];
  };
}

export interface Portfolio {
  [symbol: string]: number;
}