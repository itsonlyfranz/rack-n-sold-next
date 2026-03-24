"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, Wallet, ShoppingCart, ShieldCheck, Zap, Clock, ChevronRight, Star, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"

// NFT Card component with 3D parallax effect
const NFTCard = ({ id, name, price, isAnimated = false }: { id: number; name: string; price: string; isAnimated?: boolean }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate mouse position relative to card center
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate rotation (max 10 degrees)
    const rotateY = (mouseX / (rect.width / 2)) * 5;
    const rotateX = -(mouseY / (rect.height / 2)) * 5;
    
    setRotateX(rotateX);
    setRotateY(rotateY);
    
    // Update shine effect position
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMouseX(x);
    setMouseY(y);
  };

  const handleMouseLeave = () => {
    // Reset rotation when mouse leaves
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div 
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gray-900 border border-gray-800",
        "transition-all duration-500 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]",
        "card-3d cursor-pointer",
        isAnimated && "animate-fade-in opacity-0"
      )}
      style={{ 
        animationDelay: `${id * 150}ms`,
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-3d-content aspect-square relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 to-teal-700/80 opacity-70 group-hover:opacity-60 transition-opacity duration-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3/4 h-3/4 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-700">
            <Sparkles className="w-12 h-12 text-white animate-pulse-glow" />
          </div>
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-black/40 text-white border-gray-700 backdrop-blur-sm">
            {price} ETH
          </Badge>
        </div>
        <div 
          className="card-3d-shine" 
          style={{ 
            '--x': `${mouseX}%`, 
            '--y': `${mouseY}%` 
          } as React.CSSProperties} 
        />
      </div>
      <div className="p-4 relative z-10">
        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{name}</h3>
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs">
              AC
            </div>
            <span className="text-xs text-gray-400">@artist{id}</span>
          </div>
          <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 p-0 h-8 w-8 rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Feature card component for "How It Works" and "Why Choose Us" sections
const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  index = 0,
  variant = "default"
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  index?: number;
  variant?: "default" | "bordered";
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={cardRef}
      className={cn(
        "rounded-2xl p-6 transition-all duration-500 animate-slide-up",
        variant === "default" ? "bg-gray-900" : "border border-gray-800 bg-gray-900/50",
        variant === "default" ? "hover:bg-gray-800" : "hover:border-emerald-500/30 hover:bg-gray-900",
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className={cn(
        "mb-4 inline-flex items-center justify-center rounded-xl p-2",
        variant === "default" ? "bg-emerald-900/30" : ""
      )}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}

// Animated counter component
const AnimatedCounter = ({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) => {
  const [count, setCount] = useState(0);
  const targetValue = parseInt(value.replace(/,/g, ''));
  const counterRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const timeout = setTimeout(() => {
              const step = Math.max(1, Math.floor(targetValue / 30));
              const timer = setInterval(() => {
                setCount(prevCount => {
                  const nextCount = prevCount + step;
                  if (nextCount >= targetValue) {
                    clearInterval(timer);
                    return targetValue;
                  }
                  return nextCount;
                });
              }, 50);
              
              return () => clearInterval(timer);
            }, delay);
            
            return () => clearTimeout(timeout);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (counterRef.current) {
      observer.observe(counterRef.current);
    }
    
    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [targetValue, delay]);
  
  return (
    <div ref={counterRef} className="text-center animate-scale" style={{ transitionDelay: `${delay}ms` }}>
      <div className="text-3xl md:text-4xl font-bold text-white mb-1">{count.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
};

// Floating background element
const FloatingElement = ({ 
  className, 
  size = "md", 
  color = "emerald", 
  delay = 0,
  reverse = false
}: { 
  className?: string; 
  size?: "sm" | "md" | "lg"; 
  color?: "emerald" | "teal" | "blue"; 
  delay?: number;
  reverse?: boolean;
}) => {
  const sizeClasses = {
    sm: "w-[30%] h-[30%]",
    md: "w-[50%] h-[50%]",
    lg: "w-[70%] h-[70%]"
  };
  
  const colorClasses = {
    emerald: "bg-emerald-900/20",
    teal: "bg-teal-900/20",
    blue: "bg-blue-900/20"
  };
  
  return (
    <div 
      className={cn(
        "absolute rounded-full blur-3xl",
        sizeClasses[size],
        colorClasses[color],
        reverse ? "animate-float-reverse" : "animate-float",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
};

// Scroll observer hook
function useScrollObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const elements = document.querySelectorAll('.animate-slide-up, .animate-scale, .animate-stagger-children');
    elements.forEach(el => observer.observe(el));
    
    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, []);
}

export function NFTMarketplaceHero() {
  useScrollObserver();

  return (
    <div className="w-full bg-gray-950">
      {/* Hero Section — top padding tuned for shared sticky Header (in document flow) */}
      <section className="relative overflow-hidden pt-8 pb-20 md:pt-12 md:pb-32">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingElement color="emerald" size="lg" className="-top-[30%] -left-[10%]" />
          <FloatingElement color="teal" size="lg" className="-bottom-[20%] -right-[10%]" delay={1000} reverse={true} />
          <FloatingElement color="blue" size="md" className="top-[20%] right-[10%]" delay={2000} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Badge */}
            <Badge variant="outline" className="animate-appear-zoom mb-6 py-1.5 px-4 bg-gray-900/80 backdrop-blur-sm border-gray-800">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 mr-1.5" />
              <span className="text-gray-300">Baguio's Digital Art Marketplace</span>
            </Badge>

            {/* Title */}
            <h1 className="animate-appear-zoom text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 mb-6 leading-tight animate-text-gradient">
              Empowering Baguio Artists, One NFT at a Time
            </h1>

            {/* Description */}
            <p className="animate-appear opacity-0 text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8" style={{ animationDelay: "150ms" }}>
              Supporting local Baguio and Benguet creators in the digital art world. No crypto wallet needed—just your passion for art. Join our community-focused marketplace where Session Road meets the blockchain.
            </p>

            {/* Actions */}
            <div className="animate-appear opacity-0 flex flex-col sm:flex-row gap-4 mb-16" style={{ animationDelay: "300ms" }}>
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 px-8 relative overflow-hidden group">
                <Link href="/gallery" className="flex items-center gap-2 relative z-10">
                  <ShoppingCart className="h-4 w-4" />
                  Start Exploring
                </Link>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10"></div>
              </Button>
              <Button size="lg" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-8 relative overflow-hidden group">
                <Link href="/auth/signup" className="flex items-center gap-2 relative z-10">
                  <Sparkles className="h-4 w-4" />
                  New to NFTs? Start Here
                </Link>
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </Button>
            </div>
            
            {/* Stats */}
            <div className="animate-stagger-children grid grid-cols-1 md:grid-cols-3 gap-6 py-8 px-4 rounded-2xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 w-full">
              <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-full bg-emerald-900/40 flex items-center justify-center mb-4 group-hover:bg-emerald-900/60 transition-all duration-300">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Supporting Local Artists</h3>
                <p className="text-gray-400 text-center text-sm">Empowering Baguio and Benguet creators with secure, transparent transactions</p>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-teal-500/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-full bg-teal-900/40 flex items-center justify-center mb-4 group-hover:bg-teal-900/60 transition-all duration-300">
                  <Zap className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Wallet Needed</h3>
                <p className="text-gray-400 text-center text-sm">Perfect for Baguio creators—start selling your art without crypto wallets or technical knowledge</p>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-amber-500/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-full bg-amber-900/40 flex items-center justify-center mb-4 group-hover:bg-amber-900/60 transition-all duration-300">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Community Support</h3>
                <p className="text-gray-400 text-center text-sm">Get assistance from our dedicated team and connect with fellow Baguio artists</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Are NFTs? Educational Section */}
      <section className="py-24 px-4 relative overflow-hidden bg-gray-900/30">
        <div className="absolute inset-0 overflow-hidden">
          <FloatingElement color="emerald" size="sm" className="top-[20%] left-[10%]" delay={300} />
          <FloatingElement color="teal" size="sm" className="bottom-[30%] right-[10%]" delay={800} reverse={true} />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
            <Badge variant="outline" className="mb-4 bg-gray-900 border-gray-800 text-emerald-400">
              <Star className="h-3.5 w-3.5 text-amber-400 mr-1.5" />
              For Baguio Artists & Collectors
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              What Are NFTs?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              NFTs (Non-Fungible Tokens) are unique digital items stored on a blockchain, representing ownership of digital art, collectibles, music, videos, and more. Perfect for Baguio and Benguet artists looking to showcase their work globally while maintaining authenticity and ownership.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-stagger-children">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Unique & Authentic</h3>
              <p className="text-gray-400">
                Each NFT has a unique identifier that can't be replicated, ensuring authenticity and ownership of your digital assets—perfect for Baguio artists protecting their creative work.
              </p>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-teal-900/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Digital Ownership</h3>
              <p className="text-gray-400">
                NFTs give you true ownership of digital items that you can buy, sell, or trade—just like physical collectibles. Ideal for Benguet creators building their digital art portfolio.
              </p>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-900/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Growing Market</h3>
              <p className="text-gray-400">
                The NFT market is expanding rapidly, with artists, creators, and collectors joining every day. Baguio's creative community is discovering new opportunities in digital art.
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-center animate-slide-up">
            <Button variant="outline" className="border-gray-700 text-emerald-400 hover:bg-emerald-900/20 hover:border-emerald-500/50">
              <Link href="/learn-more" className="flex items-center gap-2">
                Learn More About NFTs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingElement color="emerald" size="md" className="top-[10%] left-[5%]" delay={300} />
          <FloatingElement color="teal" size="md" className="bottom-[10%] right-[5%]" delay={800} reverse={true} />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 animate-slide-up">
            <Badge variant="outline" className="mb-4 bg-gray-900 border-gray-800 text-emerald-400">
              <Star className="h-3.5 w-3.5 text-amber-400 mr-1.5" />
              Easy Steps
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How Rack N Sold Works for Baguio Artists
            </h2>
            <p className="text-gray-400">
              We bridge the gap between Baguio creators and the NFT world with a simple, guided experience—no crypto wallet needed
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-stagger-children">
            {[
              {
                title: "Create an Account",
                description: "Sign up for free in seconds—perfect for Baguio artists new to NFTs. No crypto knowledge or wallet required",
                icon: <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              },
              {
                title: "Upload Your Art",
                description: "Showcase your Baguio-inspired artwork or Benguet cultural pieces with detailed descriptions",
                icon: <Sparkles className="h-6 w-6 text-teal-400" />
              },
              {
                title: "Learn as You Go",
                description: "Access beginner-friendly guides perfect for local creators exploring digital art for the first time",
                icon: <svg className="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              },
              {
                title: "Sell with Confidence",
                description: "Sell your NFTs securely through our OpenSea-powered marketplace—no wallet setup needed",
                icon: <ShoppingCart className="h-6 w-6 text-emerald-400" />
              }
            ].map((step, i) => (
              <FeatureCard 
                key={i} 
                icon={step.icon} 
                title={step.title} 
                description={step.description}
                index={i}
              />
            ))}
          </div>
          
          <div className="mt-16 flex justify-center animate-slide-up">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 max-w-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">No Crypto Wallet? No Problem!</h3>
              </div>
              <p className="text-gray-400">
                Unlike traditional NFT platforms, Rack N Sold lets Baguio and Benguet artists start selling their digital art without needing to set up a crypto wallet first. Perfect for local creators who are new to NFTs—we handle the technical complexity while you focus on your art. Whether you're inspired by Burnham Park, Session Road, or the mountains of Benguet, your creativity takes center stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 animate-slide-up">
            <Badge variant="outline" className="mb-4 bg-gray-900 border-gray-800 text-emerald-400">
              <Star className="h-3.5 w-3.5 text-amber-400 mr-1.5" />
              Why Rack N Sold for Baguio
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Baguio's Bridge to the NFT World
            </h2>
            <p className="text-gray-400">
              We make entering the NFT space simple, safe, and enjoyable for Baguio and Benguet artists—supporting local creativity in the digital age
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-stagger-children">
            {[
              {
                title: "Beginner-Friendly Interface",
                description: "Our intuitive platform is designed specifically for Baguio artists new to NFTs, with clear guidance at every step—perfect for local creators",
                icon: <svg className="h-6 w-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              },
              {
                title: "OpenSea Integration",
                description: "Access the world's largest NFT marketplace through our simplified interface, helping Baguio artists reach global audiences",
                icon: <svg className="h-6 w-6 text-emerald-400" width="24" height="24" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M45 0C20.151 0 0 20.151 0 45C0 69.849 20.151 90 45 90C69.849 90 90 69.849 90 45C90 20.151 69.858 0 45 0ZM22.203 46.512L22.392 46.206L34.101 27.891C34.272 27.63 34.677 27.657 34.803 27.945C36.756 32.328 38.448 37.782 37.656 41.175C37.323 42.57 36.396 44.46 35.352 46.206C35.217 46.458 35.073 46.71 34.911 46.953C34.839 47.061 34.713 47.124 34.578 47.124H22.545C22.221 47.124 22.032 46.773 22.203 46.512ZM74.376 52.812C74.376 52.983 74.277 53.127 74.133 53.19C73.224 53.577 70.119 55.008 68.832 56.799C65.538 61.38 63.027 67.932 57.402 67.932H33.948C25.632 67.932 18.9 61.173 18.9 52.83V52.56C18.9 52.344 19.08 52.164 19.305 52.164H32.373C32.634 52.164 32.823 52.398 32.805 52.659C32.706 53.505 32.868 54.378 33.273 55.17C34.047 56.745 35.658 57.726 37.395 57.726H43.866V52.677H37.467C37.143 52.677 36.945 52.299 37.134 52.029C37.206 51.921 37.278 51.813 37.368 51.687C37.971 50.823 38.835 49.491 39.699 47.97C40.284 46.944 40.851 45.846 41.31 44.748C41.4 44.55 41.472 44.343 41.553 44.145C41.679 43.794 41.805 43.461 41.895 43.137C41.985 42.858 42.066 42.57 42.138 42.3C42.354 41.364 42.444 40.374 42.444 39.348C42.444 38.943 42.426 38.52 42.39 38.124C42.372 37.683 42.318 37.242 42.264 36.801C42.228 36.414 42.156 36.027 42.084 35.631C41.985 35.046 41.859 34.461 41.715 33.876L41.661 33.651C41.553 33.246 41.454 32.868 41.328 32.463C40.959 31.203 40.545 29.97 40.095 28.818C39.933 28.359 39.753 27.918 39.564 27.486C39.294 26.82 39.015 26.217 38.763 25.65C38.628 25.389 38.52 25.155 38.412 24.912C38.286 24.642 38.16 24.372 38.025 24.111C37.935 23.913 37.827 23.724 37.755 23.544L36.963 22.086C36.855 21.888 37.035 21.645 37.251 21.708L42.201 23.049H42.219C42.228 23.049 42.228 23.049 42.237 23.049L42.885 23.238L43.605 23.436L43.866 23.508V20.574C43.866 19.152 45 18 46.413 18C47.115 18 47.754 18.288 48.204 18.756C48.663 19.224 48.951 19.863 48.951 20.574V24.939L49.482 25.083C49.518 25.101 49.563 25.119 49.599 25.146C49.725 25.236 49.914 25.38 50.148 25.56C50.337 25.704 50.535 25.884 50.769 26.073C51.246 26.46 51.822 26.955 52.443 27.522C52.605 27.666 52.767 27.81 52.92 27.963C53.721 28.71 54.621 29.583 55.485 30.555C55.728 30.834 55.962 31.104 56.205 31.401C56.439 31.698 56.7 31.986 56.916 32.274C57.213 32.661 57.519 33.066 57.798 33.489C57.924 33.687 58.077 33.894 58.194 34.092C58.554 34.623 58.86 35.172 59.157 35.721C59.283 35.973 59.409 36.252 59.517 36.522C59.85 37.26 60.111 38.007 60.273 38.763C60.327 38.925 60.363 39.096 60.381 39.258V39.294C60.435 39.51 60.453 39.744 60.471 39.987C60.543 40.752 60.507 41.526 60.345 42.3C60.273 42.624 60.183 42.93 60.075 43.263C59.958 43.578 59.85 43.902 59.706 44.217C59.427 44.856 59.103 45.504 58.716 46.098C58.59 46.323 58.437 46.557 58.293 46.782C58.131 47.016 57.96 47.241 57.816 47.457C57.609 47.736 57.393 48.024 57.168 48.285C56.97 48.555 56.772 48.825 56.547 49.068C56.241 49.437 55.944 49.779 55.629 50.112C55.449 50.328 55.251 50.553 55.044 50.751C54.846 50.976 54.639 51.174 54.459 51.354C54.144 51.669 53.892 51.903 53.676 52.11L53.163 52.569C53.091 52.641 52.992 52.677 52.893 52.677H48.951V57.726H53.91C55.017 57.726 56.07 57.339 56.925 56.61C57.213 56.358 58.482 55.26 59.985 53.604C60.039 53.541 60.102 53.505 60.174 53.487L73.863 49.527C74.124 49.455 74.376 49.644 74.376 49.914V52.812V52.812Z" fill="currentColor"/>
                </svg>
              },
              {
                title: "Educational Resources",
                description: "Learn as you explore with our built-in guides perfect for Baguio artists—explaining NFT concepts in simple, easy-to-understand terms",
                icon: <svg className="h-6 w-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            ].map((feature, i) => (
              <FeatureCard 
                key={i} 
                icon={feature.icon} 
                title={feature.title} 
                description={feature.description}
                variant="bordered"
                index={i}
              />
            ))}
          </div>
          
          <div className="mt-16 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-2xl p-8 border border-gray-800 animate-slide-up">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2">
                <h3 className="text-2xl font-bold text-white mb-4">From Baguio Artist to Digital Creator</h3>
                <p className="text-gray-400 mb-6">
                  Rack N Sold is designed to transform Baguio and Benguet artists from curious about NFTs to confident digital creators. Our platform removes technical barriers and simplifies the entire process—perfect for local artists inspired by Burnham Park, Mines View, or the mountains of Benguet.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-emerald-400 border border-emerald-900/30">
                    No crypto knowledge needed
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-teal-400 border border-teal-900/30">
                    Supporting Baguio artists
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-amber-400 border border-amber-900/30">
                    OpenSea-powered marketplace
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-xl animate-pulse-glow"></div>
                  <div className="relative bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">Trusted by Newcomers</h4>
                        <p className="text-gray-400 text-sm">Join thousands of NFT beginners</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-300">Simple, jargon-free experience</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-300">Access to OpenSea's vast marketplace</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-300">Step-by-step guidance throughout</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-900 p-8 md:p-16 animate-scale">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <FloatingElement color="emerald" size="md" className="top-[10%] left-[5%] bg-white/5" delay={200} />
              <FloatingElement color="teal" size="md" className="bottom-[10%] right-[5%] bg-white/5" delay={700} reverse={true} />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Your Gateway to the NFT Universe
                </h2>
                <p className="text-emerald-200 max-w-xl">
                  Join Rack N Sold today and let us bridge the gap between you and the exciting world of NFTs. No technical knowledge required—just curiosity and creativity.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-100 border-0 px-8 relative overflow-hidden group">
                  <Link href="/auth/signup" className="flex items-center gap-2 relative z-10">
                    Start Your Journey
                  </Link>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-teal-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 relative overflow-hidden group">
                  <Link href="/marketplace" className="flex items-center gap-2 relative z-10">
                    Explore NFTs
                  </Link>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </Button>
              </div>
            </div>
            
            {/* OpenSea Integration Highlight */}
            <div className="mt-12 pt-8 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" width="24" height="24" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M45 0C20.151 0 0 20.151 0 45C0 69.849 20.151 90 45 90C69.849 90 90 69.849 90 45C90 20.151 69.858 0 45 0ZM22.203 46.512L22.392 46.206L34.101 27.891C34.272 27.63 34.677 27.657 34.803 27.945C36.756 32.328 38.448 37.782 37.656 41.175C37.323 42.57 36.396 44.46 35.352 46.206C35.217 46.458 35.073 46.71 34.911 46.953C34.839 47.061 34.713 47.124 34.578 47.124H22.545C22.221 47.124 22.032 46.773 22.203 46.512ZM74.376 52.812C74.376 52.983 74.277 53.127 74.133 53.19C73.224 53.577 70.119 55.008 68.832 56.799C65.538 61.38 63.027 67.932 57.402 67.932H33.948C25.632 67.932 18.9 61.173 18.9 52.83V52.56C18.9 52.344 19.08 52.164 19.305 52.164H32.373C32.634 52.164 32.823 52.398 32.805 52.659C32.706 53.505 32.868 54.378 33.273 55.17C34.047 56.745 35.658 57.726 37.395 57.726H43.866V52.677H37.467C37.143 52.677 36.945 52.299 37.134 52.029C37.206 51.921 37.278 51.813 37.368 51.687C37.971 50.823 38.835 49.491 39.699 47.97C40.284 46.944 40.851 45.846 41.31 44.748C41.4 44.55 41.472 44.343 41.553 44.145C41.679 43.794 41.805 43.461 41.895 43.137C41.985 42.858 42.066 42.57 42.138 42.3C42.354 41.364 42.444 40.374 42.444 39.348C42.444 38.943 42.426 38.52 42.39 38.124C42.372 37.683 42.318 37.242 42.264 36.801C42.228 36.414 42.156 36.027 42.084 35.631C41.985 35.046 41.859 34.461 41.715 33.876L41.661 33.651C41.553 33.246 41.454 32.868 41.328 32.463C40.959 31.203 40.545 29.97 40.095 28.818C39.933 28.359 39.753 27.918 39.564 27.486C39.294 26.82 39.015 26.217 38.763 25.65C38.628 25.389 38.52 25.155 38.412 24.912C38.286 24.642 38.16 24.372 38.025 24.111C37.935 23.913 37.827 23.724 37.755 23.544L36.963 22.086C36.855 21.888 37.035 21.645 37.251 21.708L42.201 23.049H42.219C42.228 23.049 42.228 23.049 42.237 23.049L42.885 23.238L43.605 23.436L43.866 23.508V20.574C43.866 19.152 45 18 46.413 18C47.115 18 47.754 18.288 48.204 18.756C48.663 19.224 48.951 19.863 48.951 20.574V24.939L49.482 25.083C49.518 25.101 49.563 25.119 49.599 25.146C49.725 25.236 49.914 25.38 50.148 25.56C50.337 25.704 50.535 25.884 50.769 26.073C51.246 26.46 51.822 26.955 52.443 27.522C52.605 27.666 52.767 27.81 52.92 27.963C53.721 28.71 54.621 29.583 55.485 30.555C55.728 30.834 55.962 31.104 56.205 31.401C56.439 31.698 56.7 31.986 56.916 32.274C57.213 32.661 57.519 33.066 57.798 33.489C57.924 33.687 58.077 33.894 58.194 34.092C58.554 34.623 58.86 35.172 59.157 35.721C59.283 35.973 59.409 36.252 59.517 36.522C59.85 37.26 60.111 38.007 60.273 38.763C60.327 38.925 60.363 39.096 60.381 39.258V39.294C60.435 39.51 60.453 39.744 60.471 39.987C60.543 40.752 60.507 41.526 60.345 42.3C60.273 42.624 60.183 42.93 60.075 43.263C59.958 43.578 59.85 43.902 59.706 44.217C59.427 44.856 59.103 45.504 58.716 46.098C58.59 46.323 58.437 46.557 58.293 46.782C58.131 47.016 57.96 47.241 57.816 47.457C57.609 47.736 57.393 48.024 57.168 48.285C56.97 48.555 56.772 48.825 56.547 49.068C56.241 49.437 55.944 49.779 55.629 50.112C55.449 50.328 55.251 50.553 55.044 50.751C54.846 50.976 54.639 51.174 54.459 51.354C54.144 51.669 53.892 51.903 53.676 52.11L53.163 52.569C53.091 52.641 52.992 52.677 52.893 52.677H48.951V57.726H53.91C55.017 57.726 56.07 57.339 56.925 56.61C57.213 56.358 58.482 55.26 59.985 53.604C60.039 53.541 60.102 53.505 60.174 53.487L73.863 49.527C74.124 49.455 74.376 49.644 74.376 49.914V52.812V52.812Z" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Powered by OpenSea</h4>
                  <p className="text-emerald-200 text-sm">Access the world's largest NFT marketplace</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
                  10M+ NFTs Available
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
                  Simplified Experience
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
                  Beginner-Friendly
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 