/* eslint-disable */
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out both',
        'fade-in-up': 'fadeInUp 0.4s ease-out both',
        'fade-in-down': 'fadeInDown 0.4s ease-out both',
        'fade-in-scale': 'fadeInScale 0.3s ease-out both',
        'slide-in-left': 'slideInLeft 0.3s ease-out both',
        'slide-in-right': 'slideInRight 0.3s ease-out both',
        shimmer: 'shimmer 2s infinite linear',
        'pulse-soft': 'pulseSoft 2s infinite ease-in-out',
        float: 'float 3s infinite ease-in-out',
        breathe: 'breathe 3s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': {opacity: '0'},
          '100%': {opacity: '1'},
        },
        fadeInUp: {
          '0%': {opacity: '0', transform: 'translateY(20px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        fadeInDown: {
          '0%': {opacity: '0', transform: 'translateY(-20px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        fadeInScale: {
          '0%': {opacity: '0', transform: 'scale(0.85)'},
          '100%': {opacity: '1', transform: 'scale(1)'},
        },
        slideInLeft: {
          '0%': {opacity: '0', transform: 'translateX(-24px)'},
          '100%': {opacity: '1', transform: 'translateX(0)'},
        },
        slideInRight: {
          '0%': {opacity: '0', transform: 'translateX(24px)'},
          '100%': {opacity: '1', transform: 'translateX(0)'},
        },
        shimmer: {
          '0%': {backgroundPosition: '-200% 0'},
          '100%': {backgroundPosition: '200% 0'},
        },
        pulseSoft: {
          '0%, 100%': {transform: 'scale(1)'},
          '50%': {transform: 'scale(1.03)'},
        },
        float: {
          '0%, 100%': {transform: 'translateY(0)'},
          '50%': {transform: 'translateY(-8px)'},
        },
        breathe: {
          '0%, 100%': {transform: 'scale(1)', opacity: '1'},
          '50%': {transform: 'scale(1.03)', opacity: '0.85'},
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
