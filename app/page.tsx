'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Portfolio, CryptoData } from './types';
import ChatBubble from './components/ChatBubble';
import ChatInput from './components/ChatInput';
import { getCryptoPrice, getTrendingCoins, searchCoinId, searchCrypto } from './utils/cryptoApi';
import { useSpeech } from './hooks/useSpeech';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your crypto assistant. Ask me about prices, trending coins, or tell me about your holdings!",
      sender: 'assistant',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio>({});
  const [portfolioPrices, setPortfolioPrices] = useState<{ [symbol: string]: CryptoData }>({});
  const inputFocusRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { speak, speechSupported } = useSpeech();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const focusInput = () => {
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updatePortfolioPrices = useCallback(async () => {
    const prices: { [symbol: string]: CryptoData } = {};
    
    for (const symbol of Object.keys(portfolio)) {
      try {
        const data = await getCryptoPrice(symbol);
        if (data) {
          prices[symbol] = data;
        }
      } catch (err) {
        console.error(`Error fetching price for ${symbol}:`, err);
      }
    }
    
    setPortfolioPrices(prices);
  }, [portfolio]);

  useEffect(() => {
    if (Object.keys(portfolio).length > 0) {
      updatePortfolioPrices();
      const interval = setInterval(updatePortfolioPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [portfolio, updatePortfolioPrices]);

  const addMessage = (text: string, sender: 'user' | 'assistant', type: 'text' | 'chart' | 'portfolio' = 'text', extraData?: any) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      text,
      sender,
      timestamp: new Date(),
      type,
      ...(type === 'chart' && extraData ? { chartData: extraData } : {}),
      ...(type === 'portfolio' && extraData ? { portfolioData: extraData } : {})
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    if (sender === 'assistant' && speechSupported && type === 'text') {
      speak(text);
    }
    
    return newMessage;
  };

  const handleUserMessage = async (text: string) => {
    addMessage(text, 'user');
    setIsLoading(true);

    const loadingMessage: Message = {
      id: 'loading',
      text: '',
      sender: 'assistant',
      timestamp: new Date(),
      isLoading: true,
      type: 'text'
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const lowerText = text.toLowerCase();

      const holdingMatch = lowerText.match(/i have (\d+\.?\d*) (\w+)/);
      if (holdingMatch) {
        const amount = parseFloat(holdingMatch[1]);
        let symbol = holdingMatch[2].toLowerCase();
        
        symbol = symbol.replace(/\d+$/, '');
        
        try {
          const data = await getCryptoPrice(symbol);
          
          if (data) {
            setPortfolio(prev => ({ ...prev, [symbol]: amount }));
            
            setMessages(prev => prev.filter(m => m.id !== 'loading'));
            addMessage(`Got it! I've noted that you have ${amount} ${symbol.toUpperCase()} (${data.name}). Current value: $${(amount * data.current_price).toFixed(2)}`, 'assistant');
          } else {
            const coinId = await searchCoinId(symbol);
            
            if (coinId) {
              const data = await getCryptoPrice(coinId);
              
              if (data) {
                setPortfolio(prev => ({ ...prev, [coinId]: amount }));
                
                setMessages(prev => prev.filter(m => m.id !== 'loading'));
                addMessage(`Got it! I've noted that you have ${amount} ${data.symbol.toUpperCase()} (${data.name}). Current value: $${(amount * data.current_price).toFixed(2)}`, 'assistant');
              } else {
                setMessages(prev => prev.filter(m => m.id !== 'loading'));
                addMessage(`I couldn't find a cryptocurrency called "${symbol}". Please check the symbol and try again.`, 'assistant');
              }
            } else {
              setMessages(prev => prev.filter(m => m.id !== 'loading'));
              addMessage(`I couldn't find a cryptocurrency called "${symbol}". Please check the symbol and try again.`, 'assistant');
            }
          }
        } catch (err) {
          console.error('Error verifying cryptocurrency:', err);
          setMessages(prev => prev.filter(m => m.id !== 'loading'));
          addMessage(`Sorry, I couldn't verify that cryptocurrency. Please try again with a common symbol like BTC, ETH, SOL, etc.`, 'assistant');
        }
        
        return;
      }

      if (lowerText.includes('price') || lowerText.includes('trading')) {
        const symbols = ['btc', 'bitcoin', 'eth', 'ethereum', 'bnb', 'sol', 'solana', 'ada', 'cardano', 'doge', 'dogecoin'];
        const foundSymbol = symbols.find(symbol => lowerText.includes(symbol));
        
        if (foundSymbol) {
          const cryptoId = foundSymbol.includes('bitcoin') ? 'bitcoin' : 
                          foundSymbol.includes('ethereum') ? 'ethereum' : 
                          foundSymbol.includes('solana') ? 'solana' :
                          foundSymbol.includes('cardano') ? 'cardano' :
                          foundSymbol.includes('dogecoin') ? 'dogecoin' :
                          foundSymbol;
          
          const data = await getCryptoPrice(cryptoId);
          
          setMessages(prev => prev.filter(m => m.id !== 'loading'));
          
          if (data) {
            const priceChange = data.price_change_percentage_24h;
            const changeEmoji = priceChange > 0 ? '📈' : '📉';
            const response = `${data.name} (${data.symbol.toUpperCase()}) is currently trading at $${data.current_price.toFixed(2)} ${changeEmoji}\n\n` +
                           `24h Change: ${priceChange.toFixed(2)}%\n` +
                           `Market Cap: $${(data.market_cap / 1e9).toFixed(2)}B`;
            
            addMessage(response, 'assistant');
            
            // Add chart as a separate message
            if (data.sparkline_in_7d?.price) {
              addMessage('', 'assistant', 'chart', { data: data.sparkline_in_7d.price, symbol: data.symbol });
            }
          } else {
            addMessage("Sorry, I couldn't find price data for that cryptocurrency.", 'assistant');
          }
          return;
        }
      }

      if (lowerText.includes('trending') || lowerText.includes('popular') || lowerText.includes('top')) {
        const trendingCoins = await getTrendingCoins();
        
        setMessages(prev => prev.filter(m => m.id !== 'loading'));
        
        if (trendingCoins.length > 0) {
          let response = "🔥 Today's trending cryptocurrencies:\n\n";
          
          trendingCoins.slice(0, 5).forEach((coin, index) => {
            const changeEmoji = coin.price_change_percentage_24h > 0 ? '📈' : '📉';
            response += `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}) - $${coin.current_price.toFixed(2)} ${changeEmoji} ${coin.price_change_percentage_24h.toFixed(2)}%\n`;
          });
          
          addMessage(response, 'assistant');
        } else {
          addMessage("Sorry, I couldn't fetch trending coins right now.", 'assistant');
        }
        return;
      }

      if (lowerText.includes('chart') || lowerText.includes('graph')) {
        setMessages(prev => prev.filter(m => m.id !== 'loading'));
        addMessage("Please ask for a specific coin's price first, and I'll show you the chart!", 'assistant');
        return;
      }

      if (lowerText.includes('portfolio') || lowerText.includes('holdings')) {
        setMessages(prev => prev.filter(m => m.id !== 'loading'));
        
        if (Object.keys(portfolio).length === 0) {
          addMessage("You haven't told me about any holdings yet. Try saying something like 'I have 2 ETH'", 'assistant');
        } else {
          // Update prices before showing portfolio
          await updatePortfolioPrices();
          
          const totalValue = Object.entries(portfolio).reduce((total, [symbol, amount]) => {
            const price = portfolioPrices[symbol]?.current_price || 0;
            return total + (price * amount);
          }, 0);
          
          addMessage(`Your portfolio is currently worth $${totalValue.toFixed(2)}`, 'assistant');
          
          // Add portfolio as a separate message
          addMessage('', 'assistant', 'portfolio', { portfolio, prices: portfolioPrices });
        }
        return;
      }

      const searchResults = await searchCrypto(text);
      
      setMessages(prev => prev.filter(m => m.id !== 'loading'));
      
      if (searchResults.length > 0) {
        const coin = searchResults[0];
        const response = `${coin.name} (${coin.symbol.toUpperCase()}) - $${coin.current_price.toFixed(2)}\n` +
                       `24h Change: ${coin.price_change_percentage_24h.toFixed(2)}%\n` +
                       `Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B`;
        
        addMessage(response, 'assistant');
      } else {
        addMessage("I'm not sure what you're asking. Try asking about crypto prices, trending coins, or tell me about your holdings!", 'assistant');
      }
      
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'loading'));
      
      if (err instanceof Error && 'response' in err && (err as { response?: { status: number } }).response?.status === 429) {
        addMessage("⚠️ Rate limit reached. Please wait a moment before making another request.", 'assistant');
      } else {
        addMessage("Sorry, I encountered an error. Please try again later.", 'assistant');
      }
    } finally {
      setIsLoading(false);
      focusInput();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-center">Crypto Chat Assistant</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {messages.map(message => (
            <ChatBubble key={message.id} message={message} />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </main>
      
      <ChatInput onSendMessage={handleUserMessage} disabled={isLoading} />
    </div>
  );
}