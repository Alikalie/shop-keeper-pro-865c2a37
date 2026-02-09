import { WifiOff, Check, Save, Printer } from 'lucide-react';

export default function OfflineIndicator() {
  return (
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />
      </div>

      <div className="relative z-10">
        {/* WiFi off icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
              <WifiOff className="w-10 h-10 text-destructive" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
              <span className="text-destructive-foreground text-xs font-bold">×</span>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white text-center mb-2">
          No Internet? No Problem.
        </h3>
        <p className="text-slate-400 text-center text-sm mb-6">
          Keep selling even when the connection drops
        </p>

        {/* Status items */}
        <div className="space-y-3">
          {[
            { icon: Save, text: 'Sales saved locally', active: true },
            { icon: Printer, text: 'Receipts print offline', active: true },
            { icon: Check, text: 'Syncs when back online', active: true },
          ].map((item, idx) => (
            <div
              key={item.text}
              className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3"
              style={{ animationDelay: `${idx * 200}ms` }}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-slate-200 text-sm">{item.text}</span>
              {item.active && (
                <Check className="w-4 h-4 text-emerald-400 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
