import React, { useState } from 'react';
import { Button } from '../../../shared/components/ui/button';
import { UserProfile } from '../../auth';
import { Menu, X, CreditCard, Settings, HelpCircle } from 'lucide-react';
import type { User } from '../../auth/types/auth.types';

interface FloatingNavbarProps {
  user?: User | null;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export function FloatingNavbar({ user, isAuthenticated = false, onLogout }: FloatingNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleBillingClick = () => {
    // TODO: Implement billing page navigation
    console.log('Navigate to billing');
  };

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-5xl px-4 animate-in fade-in-0 slide-in-from-top-3 duration-500">
      <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/10 mx-auto max-w-4xl">
        <div className="px-6 py-3.5">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <a 
                href="/" 
                className="text-xl font-serif font-bold text-foreground hover:opacity-80 transition-smooth flex items-center gap-2"
              >
                {/* <img src="/torch.webp" alt="VibeTorch" className="w-6 h-6" /> */}
                VibeTorch
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-smooth text-sm"
              >
                Docs
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-smooth text-sm"
              >
                Pricing
              </a>
              
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBillingClick}
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </Button>
                  <UserProfile user={user} onLogout={onLogout || (() => {})} compact />
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <a 
                    href="#" 
                    className="text-muted-foreground hover:text-foreground transition-smooth text-sm"
                  >
                    Login
                  </a>
                  <Button className="ds-btn-primary text-sm font-medium">
                    Get Started
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button - 우상단 */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent/50 transition-all duration-200"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu - 부드러운 애니메이션 */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-border/50 mt-3 pt-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col space-y-3">
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-foreground transition-smooth py-3 text-base min-h-[44px] flex items-center"
                >
                  Docs
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-foreground transition-smooth py-3 text-base min-h-[44px] flex items-center"
                >
                  Pricing
                </a>
                
                {isAuthenticated && user ? (
                  <div className="flex flex-col space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between py-2">
                      <UserProfile user={user} onLogout={onLogout || (() => {})} compact />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBillingClick}
                      className="flex items-center gap-2 text-left justify-start"
                    >
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </Button>
                  </div>
                ) : (
                  <>
                    <a 
                      href="#" 
                      className="text-muted-foreground hover:text-foreground transition-smooth py-3 text-base min-h-[44px] flex items-center"
                    >
                      Login
                    </a>
                    <Button className="ds-btn-primary text-left text-sm font-medium">
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}