import { useState, useEffect } from 'react';
import { Check, Receipt, BarChart3, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  type: 'customer' | 'shop' | 'system';
  text: string;
  icon?: React.ReactNode;
}

interface Scenario {
  name: string;
  messages: Message[];
}

const scenarios: Scenario[] = [
  {
    name: 'Cash Sale',
    messages: [
      { type: 'customer', text: 'Good morning, how much is rice?' },
      { type: 'shop', text: 'Le 400 per cup.' },
      { type: 'customer', text: 'Give me 3 cups please.' },
      { type: 'system', text: 'Sale recorded', icon: <Check className="w-3 h-3" /> },
      { type: 'system', text: 'Receipt printed', icon: <Receipt className="w-3 h-3" /> },
      { type: 'system', text: 'Stock updated', icon: <BarChart3 className="w-3 h-3" /> },
    ],
  },
  {
    name: 'Credit Sale',
    messages: [
      { type: 'customer', text: 'I need 2 bags of cement.' },
      { type: 'shop', text: "That's Le 15,000 total." },
      { type: 'customer', text: "I'll pay next week, add it to my credit." },
      { type: 'system', text: 'Credit sale recorded', icon: <Check className="w-3 h-3" /> },
      { type: 'system', text: 'Customer debt updated', icon: <BarChart3 className="w-3 h-3" /> },
      { type: 'system', text: 'Reminder set', icon: <Receipt className="w-3 h-3" /> },
    ],
  },
  {
    name: 'Stock Alert',
    messages: [
      { type: 'customer', text: 'Do you have cooking oil?' },
      { type: 'shop', text: 'Yes! Le 500 per bottle.' },
      { type: 'customer', text: 'Give me 5 bottles.' },
      { type: 'system', text: 'Sale completed', icon: <Check className="w-3 h-3" /> },
      { type: 'system', text: 'LOW STOCK: Only 3 left!', icon: <AlertTriangle className="w-3 h-3 text-amber-500" /> },
      { type: 'system', text: 'Reorder suggested', icon: <BarChart3 className="w-3 h-3" /> },
    ],
  },
  {
    name: 'Daily Report',
    messages: [
      { type: 'shop', text: 'End of day - generating report...' },
      { type: 'system', text: 'Total sales: Le 45,600', icon: <BarChart3 className="w-3 h-3" /> },
      { type: 'system', text: 'Cash: Le 38,200', icon: <Check className="w-3 h-3" /> },
      { type: 'system', text: 'Credit: Le 7,400', icon: <Receipt className="w-3 h-3" /> },
      { type: 'system', text: '43 transactions today', icon: <BarChart3 className="w-3 h-3" /> },
      { type: 'system', text: 'Report ready to print', icon: <Receipt className="w-3 h-3" /> },
    ],
  },
];

export default function AnimatedChat() {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const scenario = scenarios[currentScenario];
    
    if (visibleMessages < scenario.messages.length) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(v => v + 1);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      // Pause before next scenario
      const timer = setTimeout(() => {
        setVisibleMessages(0);
        setCurrentScenario(s => (s + 1) % scenarios.length);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentScenario, visibleMessages]);

  const scenario = scenarios[currentScenario];

  return (
    <div className="relative">
      {/* Scenario tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {scenarios.map((s, idx) => (
          <button
            key={s.name}
            onClick={() => {
              setCurrentScenario(idx);
              setVisibleMessages(0);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              currentScenario === idx
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border shadow-xl p-4 min-h-[320px]">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <div className="w-3 h-3 rounded-full bg-destructive/70" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <span className="text-xs text-muted-foreground ml-2">Shop Terminal</span>
        </div>

        <div className="space-y-3">
          {scenario.messages.slice(0, visibleMessages).map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-2 animate-fade-in",
                msg.type === 'customer' && "justify-start",
                msg.type === 'shop' && "justify-end",
                msg.type === 'system' && "justify-center"
              )}
            >
              {msg.type === 'system' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  {msg.icon}
                  <span>{msg.text}</span>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                    msg.type === 'customer'
                      ? "bg-muted text-foreground rounded-bl-sm"
                      : "bg-primary text-primary-foreground rounded-br-sm"
                  )}
                >
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && visibleMessages < scenario.messages.length && (
            <div
              className={cn(
                "flex gap-2",
                scenario.messages[visibleMessages].type === 'customer' && "justify-start",
                scenario.messages[visibleMessages].type === 'shop' && "justify-end",
                scenario.messages[visibleMessages].type === 'system' && "justify-center"
              )}
            >
              <div className="flex gap-1 px-4 py-3 rounded-2xl bg-muted">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse delay-75" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse delay-150" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
