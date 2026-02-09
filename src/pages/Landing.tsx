import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowRight, Play } from 'lucide-react';
import AnimatedChat from '@/components/landing/AnimatedChat';
import LiveMetrics from '@/components/landing/LiveMetrics';
import FeatureCards from '@/components/landing/FeatureCards';
import OfflineIndicator from '@/components/landing/OfflineIndicator';
import DemoPOS from '@/components/landing/DemoPOS';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">DESWIFE</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Log In
            </Button>
            <Button onClick={() => navigate('/auth?mode=signup')} className="gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Animated Chat */}
            <div className="order-2 lg:order-1">
              <AnimatedChat />
            </div>

            {/* Right - Value Proposition */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Trusted by 500+ shops
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Manage Your Shop.
                <br />
                <span className="text-primary">Track Sales.</span>
                <br />
                Print Receipts.
                <br />
                <span className="text-muted-foreground">No Stress.</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Everything you need to run your shop professionally. 
                Inventory, sales, credit tracking, and beautiful receipts—all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="gap-2 text-lg h-14 px-8">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-lg h-14 px-8">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Metrics Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Real-Time Demo
            </h2>
            <p className="text-xl font-semibold">See your shop at a glance</p>
          </div>
          <LiveMetrics />
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Try it yourself
              </h2>
              <p className="text-muted-foreground mb-8">
                Experience how easy it is to make a sale. Click products to add them to cart, 
                then checkout to see the receipt.
              </p>
              <DemoPOS />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Works even offline
              </h2>
              <p className="text-muted-foreground mb-8">
                Your business doesn't stop when the internet does. 
                Keep selling and everything syncs when you're back online.
              </p>
              <OfflineIndicator />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Shop Owners Love It
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built specifically for African retail shops. Simple, powerful, and works everywhere.
            </p>
          </div>
          <FeatureCards />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-16 text-center overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }} />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to take control of your shop?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Join hundreds of shop owners who've simplified their business with DESWIFE.
                Start free, upgrade when you're ready.
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/auth?mode=signup')}
                className="gap-2 text-lg h-14 px-8"
              >
                Create Your Shop Now
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="font-semibold">DESWIFE</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DESWIFE. Made for African businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
