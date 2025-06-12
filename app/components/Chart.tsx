import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartProps {
  data: number[];
  symbol: string;
}

export default function Chart({ data, symbol }: ChartProps) {
  const chartData = data.map((price, index) => ({
    day: index + 1,
    price: price
  }));

  return (
    <div className="w-full h-64 mt-4">
      <h3 className="text-lg font-semibold mb-2">{symbol.toUpperCase()} - 7 Day Price Chart</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
          <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}