import { useState, useEffect } from 'react';
import { TrendingUp, Receipt, Users, AlertTriangle } from 'lucide-react';

interface Metric {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
}

const initialMetrics: Metric[] = [
  { label: 'Sales Today', value: 5600, prefix: 'Le ', icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-500' },
  { label: 'Receipts Printed', value: 43, icon: <Receipt className="w-5 h-5" />, color: 'text-primary' },
  { label: 'Customers Owing', value: 7, icon: <Users className="w-5 h-5" />, color: 'text-amber-500' },
  { label: 'Stock Alerts', value: 2, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-destructive' },
];

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function LiveMetrics() {
  const [metrics, setMetrics] = useState(initialMetrics);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.label === 'Sales Today' 
          ? metric.value + Math.floor(Math.random() * 500) 
          : metric.label === 'Receipts Printed'
          ? metric.value + Math.floor(Math.random() * 3)
          : metric.value,
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <div
          key={metric.label}
          className="relative group bg-card/60 backdrop-blur-sm rounded-xl border p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className={`${metric.color} mb-2`}>
            {metric.icon}
          </div>
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            <AnimatedNumber value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {metric.label}
          </div>
          
          {/* Pulse effect */}
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
