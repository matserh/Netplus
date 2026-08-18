'use client';

// Loading skeleton for /profiles — prevents the error boundary from showing
// "Erreur de chargement" when ProfileContext hasn't hydrated from localStorage yet

export default function ProfilesLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          {/* Logo skeleton */}
          <div className="w-24 h-7 bg-muted/30 rounded animate-pulse" />
          {/* User avatar skeleton */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-muted/30 animate-pulse" />
            <div className="w-16 h-3 bg-muted/20 rounded animate-pulse hidden sm:block" />
          </div>
        </div>
      </header>

      {/* Banner skeleton */}
      <div className="w-full h-[35vh] sm:h-[40vh] bg-muted/10 animate-pulse" />

      {/* Profile selection skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-48 h-8 bg-muted/20 rounded animate-pulse mb-8" />

        {/* Profile cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-muted/20 animate-pulse" />
              <div className="w-16 h-3 bg-muted/15 rounded animate-pulse" />
              <div className="w-24 h-2 bg-muted/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
