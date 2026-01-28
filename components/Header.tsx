'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HeaderProps {
  currentPage: 'pointer' | 'dashboard' | 'setup' | 'employee';
}

export default function Header({ currentPage }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'py-2'
          : 'py-4'
      }`}
    >
      <div
        className={`max-w-5xl mx-auto px-4 transition-all duration-300 ${
          scrolled
            ? 'bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 border border-white/50 py-2'
            : 'bg-transparent py-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/logo.svg" alt="Dr!!!ng" className={`transition-all duration-300 ${scrolled ? 'h-8 sm:h-10' : 'h-10 sm:h-14'} w-auto`} />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {currentPage === 'pointer' ? (
              <span className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#2A3EF7] bg-[#2A3EF7]/10 rounded-lg">
                Pointer
              </span>
            ) : (
              <Link
                href="/"
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#4A5565] hover:text-black hover:bg-gray-100 rounded-lg transition-all"
              >
                Pointer
              </Link>
            )}
            {currentPage === 'dashboard' ? (
              <span className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#2A3EF7] bg-[#2A3EF7]/10 rounded-lg">
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Stats</span>
              </span>
            ) : (
              <Link
                href="/dashboard"
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#4A5565] hover:text-black hover:bg-gray-100 rounded-lg transition-all"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Stats</span>
              </Link>
            )}
            {currentPage === 'setup' ? (
              <span className="p-2 text-[#2A3EF7] bg-[#2A3EF7]/10 rounded-lg" title="Parametres">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
            ) : (
              <Link
                href="/setup"
                className="p-2 text-[#4A5565] hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                title="Parametres"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
