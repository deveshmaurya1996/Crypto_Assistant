import { Portfolio, CryptoData } from '../types';

interface PortfolioProps {
  portfolio: Portfolio;
  prices: { [symbol: string]: CryptoData };
}

export default function PortfolioComponent({ portfolio, prices }: PortfolioProps) {
  const totalValue = Object.entries(portfolio).reduce((total, [symbol, amount]) => {
    const price = prices[symbol]?.current_price || 0;
    return total + (price * amount);
  }, 0);

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Your Portfolio</h3>
      <div className="space-y-2">
        {Object.entries(portfolio).map(([symbol, amount]) => {
          const price = prices[symbol]?.current_price || 0;
          const value = price * amount;
          
          return (
            <div key={symbol} className="flex justify-between items-center">
              <div>
                <span className="font-medium text-gray-800">{symbol.toUpperCase()}</span>
                <span className="text-gray-600 ml-2">{amount} units</span>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-800">${value.toFixed(2)}</p>
                <p className="text-xs text-gray-600">${price.toFixed(2)} each</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t mt-3 pt-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-800">Total Value</span>
          <span className="font-semibold text-lg text-gray-800">${totalValue.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}