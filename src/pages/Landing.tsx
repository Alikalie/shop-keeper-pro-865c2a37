import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowRight, Play } from 'lucide-react';
import AnimatedChat from '@/components/landing/AnimatedChat';
import LiveMetrics from '@/components/landing/LiveMetrics';
import FeatureCards from '@/components/landing/FeatureCards';
import OfflineIndicator from '@/components/landing/OfflineIndicator';
import DemoPOS from '@/components/landing/DemoPOS';

interface CMSSection {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  is_visible: boolean;
}

export default function Landing() {
  const navigate = useNavigate();
  const [cms, setCms] = useState<Record<string, CMSSection>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('cms_content')
      .select('section_key, title, subtitle, body, image_url, video_url, is_visible')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, CMSSection> = {};
          (data as CMSSection[]).forEach(s => { map[s.section_key] = s; });
          setCms(map);
        }
        setLoaded(true);
      });
  }, []);

  const s = (key: string) => cms[key];
  const visible = (key: string) => !loaded || s(key)?.is_visible !== false;

  const hero = s('hero');
  const metrics = s('metrics');
  const demo = s('demo');
  const offline = s('offline');
  const features = s('features');
  const cta = s('cta');
  const footer = s('footer');
  const demoVideo = s('demo_video');

  // Parse hero title into parts for styling
  const heroLines = (hero?.title || 'Manage Your Shop. Track Sales. Print Receipts. No Stress.').split('. ').filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">{footer?.title || 'DESWIFE'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>Log In</Button>
            <Button onClick={() => navigate('/auth?mode=signup')} className="gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {visible('hero') && (
        <section className="pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <AnimatedChat />
              </div>
              <div className="order-1 lg:order-2 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  {hero?.subtitle || 'Trusted by 500+ shops'}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  {heroLines.map((line, i) => (
                    <span key={i}>
                      {i === 1 ? <span className="text-primary">{line}.</span> :
                       i === heroLines.length - 1 ? <span className="text-muted-foreground">{line}.</span> :
                       <>{line}.</>}
                      {i < heroLines.length - 1 && <br />}
                    </span>
                  ))}
                </h1>

                <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                  {hero?.body || 'Everything you need to run your shop professionally.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="gap-2 text-lg h-14 px-8">
                    Get Started Free <ArrowRight className="w-5 h-5" />
                  </Button>
                  {visible('demo_video') && demoVideo?.video_url && (
                    <Button size="lg" variant="outline" className="gap-2 text-lg h-14 px-8" onClick={() => {
                      const el = document.getElementById('demo-video-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}>
                      <Play className="w-5 h-5" /> Watch Demo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Demo Video Section */}
      {visible('demo_video') && demoVideo?.video_url && (
        <section id="demo-video-section" className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">{demoVideo.title || 'Watch How It Works'}</h2>
            </div>
            <div className="rounded-2xl overflow-hidden border shadow-lg">
              <video
                src={demoVideo.video_url}
                controls
                className="w-full"
                poster={demoVideo.image_url || undefined}
              />
            </div>
          </div>
        </section>
      )}

      {/* Live Metrics Section */}
      {visible('metrics') && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {metrics?.title || 'Real-Time Demo'}
              </h2>
              <p className="text-xl font-semibold">{metrics?.subtitle || 'See your shop at a glance'}</p>
            </div>
            <LiveMetrics />
          </div>
        </section>
      )}

      {/* Interactive Demo Section */}
      {(visible('demo') || visible('offline')) && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {visible('demo') && (
                <div>
                  <h2 className="text-3xl font-bold mb-4">{demo?.title || 'Try it yourself'}</h2>
                  <p className="text-muted-foreground mb-8">
                    {demo?.body || 'Experience how easy it is to make a sale.'}
                  </p>
                  <DemoPOS />
                </div>
              )}
              {visible('offline') && (
                <div>
                  <h2 className="text-3xl font-bold mb-4">{offline?.title || 'Works even offline'}</h2>
                  <p className="text-muted-foreground mb-8">
                    {offline?.body || 'Your business doesn\'t stop when the internet does.'}
                  </p>
                  <OfflineIndicator />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {visible('features') && (
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {features?.title || 'Why Shop Owners Love It'}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {features?.body || 'Built specifically for African retail shops.'}
              </p>
            </div>
            <FeatureCards />
          </div>
        </section>
      )}

      {/* CTA Section */}
      {visible('cta') && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                  backgroundSize: '32px 32px',
                }} />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  {cta?.title || 'Ready to take control of your shop?'}
                </h2>
                <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                  {cta?.body || 'Start free, upgrade when you\'re ready.'}
                </p>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/auth?mode=signup')}
                  className="gap-2 text-lg h-14 px-8"
                >
                  Create Your Shop Now <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      {visible('footer') && (
        <footer className="py-8 border-t">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="font-semibold">{footer?.title || 'DESWIFE'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {footer?.title || 'DESWIFE'}. {footer?.body || 'Made for African businesses.'}
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
