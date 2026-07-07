/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        peach: '#FFB3C6',
        mint: '#95E1C9',
        sky: '#A0D2FF',
        lemon: '#FFE066',
        cream: '#FFF9F0',
        ink: '#6B5544',
        inkSoft: '#9C8775',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontFamily: {
        round: ['"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 24px rgba(120, 90, 70, 0.16)',
        press: '0 4px 10px rgba(120, 90, 70, 0.20)',
        glow: '0 0 0 4px rgba(255, 255, 255, 0.55)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.85)' },
          '55%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-6px)' },
          '40%,80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        pop: 'pop 0.28s ease',
        wiggle: 'wiggle 0.45s ease',
        floaty: 'floaty 2.4s ease-in-out infinite',
        shake: 'shake 0.4s ease',
      },
    },
  },
  plugins: [],
};
