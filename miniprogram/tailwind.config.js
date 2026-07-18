/** @type {import('tailwindcss').Config} */
export default {
  // 仅扫描小程序源码（已放弃 @web alias，游戏用 Taro 原生组件重写）
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // —— 品牌主色（保留原色板，供 59 个游戏继续使用）——
        peach: '#FFB3C6',
        mint: '#95E1C9',
        sky: '#A0D2FF',
        lemon: '#FFE066',
        cream: '#FFF9F0',
        ink: '#5A4636',
        inkSoft: '#9C8775',
        // —— 高级中性表面层级（现代极简景深）——
        surface: '#FFFFFF',
        surfaceMuted: '#FBF7F1',
        surfaceSunken: '#F3ECE2',
        hairline: 'rgba(90, 70, 54, 0.08)',
        hairlineStrong: 'rgba(90, 70, 54, 0.14)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      fontFamily: {
        round: [
          '"PingFang SC"',
          '"HarmonyOS Sans SC"',
          '"Microsoft YaHei"',
          '"Hiragino Sans GB"',
          'system-ui',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
      // —— 分层柔和阴影：以中性冷色替代原棕色单层，营造高级景深 ——
      boxShadow: {
        xs: '0 1px 2px rgba(60, 45, 35, 0.06)',
        sm: '0 2px 6px rgba(60, 45, 35, 0.07), 0 1px 2px rgba(60, 45, 35, 0.05)',
        soft: '0 6px 18px rgba(70, 52, 40, 0.10), 0 2px 6px rgba(70, 52, 40, 0.06)',
        press: '0 2px 6px rgba(70, 52, 40, 0.14)',
        lift: '0 14px 34px rgba(70, 52, 40, 0.14), 0 4px 10px rgba(70, 52, 40, 0.08)',
        float: '0 22px 50px rgba(60, 45, 35, 0.16), 0 8px 18px rgba(60, 45, 35, 0.08)',
        glow: '0 0 0 4px rgba(255, 255, 255, 0.6), 0 8px 22px rgba(70, 52, 40, 0.12)',
        insetTop: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      backgroundImage: {
        'mesh-warm':
          'radial-gradient(1200px 600px at 12% -8%, rgba(255,179,198,0.28), transparent 55%),' +
          'radial-gradient(1000px 560px at 100% 4%, rgba(160,210,255,0.24), transparent 55%),' +
          'radial-gradient(900px 620px at 50% 120%, rgba(149,225,201,0.22), transparent 55%)',
        'sheen':
          'linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(22px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        breathe: {
          '0%,100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
        ripple: {
          to: { transform: 'scale(2.6)', opacity: '0' },
        },
      },
      animation: {
        pop: 'pop 0.28s ease',
        wiggle: 'wiggle 0.45s ease',
        floaty: 'floaty 3.6s ease-in-out infinite',
        shake: 'shake 0.4s ease',
        fadeIn: 'fadeIn 0.4s ease both',
        fadeInUp: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
        scaleIn: 'scaleIn 0.34s cubic-bezier(0.34,1.56,0.64,1) both',
        riseIn: 'riseIn 0.55s cubic-bezier(0.22,1,0.36,1) both',
        breathe: 'breathe 3s ease-in-out infinite',
        spinSlow: 'spinSlow 0.9s linear infinite',
      },
    },
  },
  plugins: [],
};
