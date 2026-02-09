import { Package, Receipt, Users, CreditCard, BarChart3, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Package,
    title: 'Track Inventory',
    description: 'Know exactly what you have, what sells fast, and when to restock.',
    color: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-500',
  },
  {
    icon: Receipt,
    title: 'Print Receipts',
    description: 'Professional receipts with your shop branding. Works with thermal printers.',
    color: 'from-emerald-500/20 to-emerald-600/10',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Users,
    title: 'Manage Staff',
    description: 'Track who sold what, when. Full accountability for your team.',
    color: 'from-purple-500/20 to-purple-600/10',
    iconColor: 'text-purple-500',
  },
  {
    icon: CreditCard,
    title: 'Control Credit Sales',
    description: 'Know who owes you money. Track payments. No more forgotten debts.',
    color: 'from-amber-500/20 to-amber-600/10',
    iconColor: 'text-amber-500',
  },
  {
    icon: BarChart3,
    title: 'See Daily Reports',
    description: 'Hourly sales, staff performance, profit margins. All in one view.',
    color: 'from-rose-500/20 to-rose-600/10',
    iconColor: 'text-rose-500',
  },
  {
    icon: WifiOff,
    title: 'Works Offline',
    description: 'No internet? No problem. Sales sync when you reconnect.',
    color: 'from-cyan-500/20 to-cyan-600/10',
    iconColor: 'text-cyan-500',
  },
];

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, idx) => (
        <div
          key={feature.title}
          className={cn(
            "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
            feature.color
          )}
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className={cn(
            "w-12 h-12 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center mb-4",
            feature.iconColor
          )}>
            <feature.icon className="w-6 h-6" />
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {feature.title}
          </h3>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>

          {/* Hover effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}
