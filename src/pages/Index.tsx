import VibetorchSteps from "@/components/VibetorchSteps";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingNavbar } from "@/features/navigation";
import VibetorchDashboard from "@/components/VibetorchDashboard";
import { Info, X } from "lucide-react";


export default function VibetorchApp() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [currentSection, setCurrentSection] = useState(0);
  const [hasInitialAnimationPlayed, setHasInitialAnimationPlayed] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const [initialAuthState, setInitialAuthState] = useState<boolean | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [leftPanelAnimationComplete, setLeftPanelAnimationComplete] = useState(false);

  // Capture initial auth state when loading completes
  useEffect(() => {
    if (!isLoading && initialAuthState === null) {
      setInitialAuthState(isAuthenticated);
      console.log('📋 Initial auth state captured:', isAuthenticated);
      
      // If user is already logged in, show navbar immediately and skip animations
      if (isAuthenticated) {
        setShowNavbar(true);
        setHasInitialAnimationPlayed(true);
        console.log('✅ User already authenticated, skipping intro animation');
      }
    }
  }, [isLoading, isAuthenticated, initialAuthState]);

  // Mark initial animation as played after component mounts (only for new users)
  useEffect(() => {
    if (initialAuthState === false) { // Only for users who weren't logged in initially
      const timer = setTimeout(() => {
        setHasInitialAnimationPlayed(true);
      }, 1000); // Match the animation duration
      return () => clearTimeout(timer);
    }
  }, [initialAuthState]);

  // Show navbar after login animation completes (only for fresh logins)
  useEffect(() => {
    if (isAuthenticated && initialAuthState === false) {
      // Check if mobile (screen width < 1024px for lg breakpoint)
      const isMobile = window.innerWidth < 1024;
      
      if (isMobile) {
        // Mobile: just show navbar without auto-scroll
        const timer = setTimeout(() => {
          setShowNavbar(true);
        }, 300); // Shorter delay for mobile
        return () => clearTimeout(timer);
      } else {
        // Desktop: use slide-out animation
        const timer = setTimeout(() => {
          setShowNavbar(true);
          setLeftPanelAnimationComplete(true); // Hide panel after animation completes
        }, 1700); // 1.2s slide-out animation + 0.5s buffer
        return () => clearTimeout(timer);
      }
    } else if (!isAuthenticated) {
      setShowNavbar(false);
    }
  }, [isAuthenticated, initialAuthState]);

  // Handle global mouse/touch events for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newOffset = {
          x: e.clientX - startPosition.x,
          y: e.clientY - startPosition.y
        };
        setDragOffset(newOffset);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Animate back to original position
        setDragOffset({ x: 0, y: 0 });
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        const newOffset = {
          x: touch.clientX - startPosition.x,
          y: touch.clientY - startPosition.y
        };
        setDragOffset(newOffset);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        // Animate back to original position
        setDragOffset({ x: 0, y: 0 });
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, startPosition]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    if ('touches' in e) {
      const touch = e.touches[0];
      setStartPosition({ x: touch.clientX, y: touch.clientY });
    } else {
      setStartPosition({ x: e.clientX, y: e.clientY });
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-cta-200 border-t-cta-600 rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Loading VibeTorch...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @keyframes panLeft {
          0% {
            transform: translateX(-33%) translateY(-50%);
          }
          100% {
            transform: translateX(0%) translateY(-50%);
          }
        }
        @keyframes slideOutLeft {
          0% {
            transform: translateX(0%);
            opacity: 1;
          }
          80% {
            transform: translateX(-90%);
            opacity: 0.2;
          }
          100% {
            transform: translateX(-100%);
            opacity: 0;
          }
        }
        @keyframes expandRight {
          0% {
            margin-left: 40%;
            width: 60%;
          }
          100% {
            margin-left: 0%;
            width: 100%;
          }
        }
        @media (max-width: 1023px) {
          .expand-right {
            animation: none !important;
          }
          .panel-right {
            scroll-snap-type: none !important;
          }
        }
        .panel-right::-webkit-scrollbar {
          display: none;
        }
        .panel-right {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .slide-out-left {
          animation: slideOutLeft 1.2s ease-in-out forwards;
        }
        .expand-right {
          animation: expandRight 1.2s ease-in-out forwards;
        }
        @media (min-width: 1024px) {
          .lg\\:slide-out-left {
            animation: slideOutLeft 1.2s ease-in-out forwards;
          }
        }
        @keyframes fadeInDown {
          0% {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .navbar-fade-in {
          animation: fadeInDown 0.5s ease-out forwards;
        }
      `}</style>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Panel - Marketing (hide for pre-authenticated users and after slide-out animation) */}
        {!(initialAuthState === true) && !leftPanelAnimationComplete && (
          <div className={`hidden lg:flex lg:w-2/5 panel-left p-6 lg:p-8 flex-col lg:fixed lg:h-screen relative overflow-hidden ${isAuthenticated ? 'lg:slide-out-left' : ''}`}>
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 opacity-5 flex items-center justify-center">
            <div className="absolute top-20 left-10 w-32 h-32 bg-cta-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-24 h-24 bg-accent rounded-full blur-2xl"></div>
          </div>

          {/* Top Navigation - GitHub Link & Theme Toggle */}
          <div className="flex items-center justify-between mb-4 lg:mb-6 relative z-20">
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a 
                href="https://github.com/Vbraniumlads/exchange-llm-ui" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cta-600 hover:text-cta-700 transition-colors duration-200 font-medium text-sm lg:text-base"
                style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}}
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="hidden sm:inline">View on GitHub</span>
              </a>
            </div>
          </div>
          
          {/* Content Area - Center aligned */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Logo Mark */}
            <div className="relative mb-2">
              <div className="w-full h-80 lg:h-[28rem] relative overflow-hidden">
                <img 
                  src="/torch.webp" 
                  alt="Vibetorch" 
                  className="w-[150%] h-auto max-h-none object-contain absolute top-1/2 -left-20 transform -translate-y-1/2 rounded-3xl cursor-grab"
                  style={{
                    animation: isDragging || hasInitialAnimationPlayed ? 'none' : 'panLeft 1s ease-in-out',
                    transform: `translateX(${-20 + (dragOffset.x * 0.1)}px) translateY(${-50 + (dragOffset.y * 0.03)}%)`,
                    transition: isDragging ? 'none' : 'transform 1.2s cubic-bezier(0.23, 1, 0.32, 1)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    zIndex: isDragging ? 50 : 10
                  }}
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                  draggable={false}
                />
              </div>
            </div>

            {/* Headlines */}
            <div className="mb-8 relative z-10">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-sans font-bold text-cta-700 mb-4 lg:mb-6 leading-[1.1] tracking-tight" style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}}>
                Vibe must flow.
              </h1>
              <p className="text-lg lg:text-xl text-foreground leading-relaxed font-sans" style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}}>
                Rest easy, AI's got the night shift.
                Automated Vibe Coding when you're not around.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Right Panel - Vibetorch Steps */}
        <div 
          className={`panel-right overflow-y-auto w-full ${
            initialAuthState === true 
              ? 'lg:w-full lg:ml-0' // Already authenticated - full width immediately
              : isAuthenticated 
                ? 'lg:w-full lg:ml-0 expand-right' // Fresh login - animate to full width
                : 'lg:w-3/5 lg:ml-[40%]' // Not authenticated - partial width
          }`}
          style={{ 
            height: '100vh',
            scrollSnapType: window.innerWidth >= 1024 ? 'y mandatory' : 'none',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          onScroll={(e) => {
            const scrollTop = e.currentTarget.scrollTop;
            const sectionIndex = Math.round(scrollTop / window.innerHeight);
            setCurrentSection(sectionIndex);
          }}
        >
          {/* Floating Navbar - Only show after login animation completes */}
          {showNavbar && (
            <div>
              <FloatingNavbar 
                user={user}
                isAuthenticated={isAuthenticated}
                onLogout={logout}
              />
            </div>
          )}
          {isAuthenticated ? <VibetorchDashboard /> : <VibetorchSteps />}
          {/* Dot Navigation - Only show when not authenticated */}
          {!isAuthenticated && (
            <div className="fixed right-2 top-1/2 transform -translate-y-1/2 z-50 space-y-2 flex flex-col">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  onClick={() => {
                    const container = document.querySelector('.panel-right');
                    if (container) {
                      container.scrollTo({
                        top: index * window.innerHeight,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className={`w-1.5 h-1.5 rounded-full border transition-all duration-300 hover:scale-110 ${
                    currentSection === index 
                      ? 'bg-cta-500 border-cta-500 opacity-100' 
                      : 'bg-transparent border-cta-500 opacity-50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Floating Info Button - Only show on mobile when not authenticated */}
        {!isAuthenticated && (
          <button
            onClick={() => setShowInfoModal(true)}
            className="fixed bottom-6 left-6 lg:hidden z-50 w-12 h-12 bg-cta-500 hover:bg-cta-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
          >
            <Info className="w-5 h-5" />
          </button>
        )}

        {/* Mobile Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowInfoModal(false)}
            />
            
            {/* Modal Content */}
            <div className="absolute inset-4 bg-background rounded-xl shadow-xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">VibeTorch</h2>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Logo */}
                <div className="text-center mb-6">
                  <img 
                    src="/torch.webp" 
                    alt="Vibetorch" 
                    className="w-24 h-24 mx-auto rounded-2xl mb-4"
                  />
                  <h1 className="text-2xl font-bold text-cta-700 mb-2">
                    Vibe must flow.
                  </h1>
                  <p className="text-sm text-foreground leading-relaxed">
                    Rest easy, AI's got the night shift.
                    Automated Vibe Coding when you're not around.
                  </p>
                </div>
                
                {/* GitHub Link */}
                <div className="text-center">
                  <a 
                    href="https://github.com/Vbraniumlads/exchange-llm-ui" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-cta-600 hover:text-cta-700 transition-colors duration-200 font-medium text-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    View on GitHub
                  </a>
                </div>
              </div>
              
              {/* Footer with Theme Toggle */}
              <div className="p-4 border-t border-border">
                <div className="flex justify-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}