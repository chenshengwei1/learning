// ==================== SVG 资源库 ====================
// 
// 用法：
//   SVGLibrary.get('fox')  → Data URI
//   元素配置中：svg: '@fox'  → 自动转为 Data URI
//   元素配置中：svg: 'assets/svg/xxx.svg'  → 保持为外部路径

const SVGLibrary = (function() {
    'use strict';
    
    // ============================================================
    // 原始 SVG 定义
    // ============================================================
    
    const RAW_SVGS = {
        
        // ===== 动物 =====
        
        fox: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 22 30 L 18 8 L 38 22 Z" fill="#e63946" stroke="#a4161a" stroke-width="2"/>
  <path d="M 78 30 L 82 8 L 62 22 Z" fill="#e63946" stroke="#a4161a" stroke-width="2"/>
  <path d="M 24 28 L 21 14 L 34 24 Z" fill="#ffb3ba"/>
  <path d="M 76 28 L 79 14 L 66 24 Z" fill="#ffb3ba"/>
  <ellipse cx="50" cy="55" rx="32" ry="30" fill="#e63946" stroke="#a4161a" stroke-width="2"/>
  <ellipse cx="50" cy="62" rx="24" ry="20" fill="#ffb3ba"/>
  <ellipse cx="38" cy="52" rx="5" ry="6" fill="#1a1a1a"/>
  <ellipse cx="62" cy="52" rx="5" ry="6" fill="#1a1a1a"/>
  <ellipse cx="39" cy="50" rx="2" ry="2" fill="#fff"/>
  <ellipse cx="63" cy="50" rx="2" ry="2" fill="#fff"/>
  <ellipse cx="50" cy="65" rx="4" ry="3" fill="#1a1a1a"/>
  <line x1="30" y1="62" x2="42" y2="63" stroke="#a4161a" stroke-width="1"/>
  <line x1="30" y1="66" x2="42" y2="66" stroke="#a4161a" stroke-width="1"/>
  <line x1="58" y1="63" x2="70" y2="62" stroke="#a4161a" stroke-width="1"/>
  <line x1="58" y1="66" x2="70" y2="66" stroke="#a4161a" stroke-width="1"/>
</svg>`,
        
        owl: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 25 25 L 20 8 L 35 20 Z" fill="#a855f7" stroke="#7e22ce" stroke-width="2"/>
  <path d="M 75 25 L 80 8 L 65 20 Z" fill="#a855f7" stroke="#7e22ce" stroke-width="2"/>
  <ellipse cx="50" cy="55" rx="34" ry="32" fill="#a855f7" stroke="#7e22ce" stroke-width="2"/>
  <circle cx="38" cy="52" r="12" fill="#fff" stroke="#7e22ce" stroke-width="1.5"/>
  <circle cx="62" cy="52" r="12" fill="#fff" stroke="#7e22ce" stroke-width="1.5"/>
  <circle cx="38" cy="52" r="6" fill="#1a1a1a"/>
  <circle cx="62" cy="52" r="6" fill="#1a1a1a"/>
  <circle cx="40" cy="50" r="2" fill="#fff"/>
  <circle cx="64" cy="50" r="2" fill="#fff"/>
  <path d="M 50 60 L 45 70 L 55 70 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
</svg>`,
        
        cat: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 22 30 L 18 10 L 40 24 Z" fill="#60a5fa" stroke="#2563eb" stroke-width="2"/>
  <path d="M 78 30 L 82 10 L 60 24 Z" fill="#60a5fa" stroke="#2563eb" stroke-width="2"/>
  <path d="M 25 28 L 22 16 L 36 24 Z" fill="#dbeafe"/>
  <path d="M 75 28 L 78 16 L 64 24 Z" fill="#dbeafe"/>
  <ellipse cx="50" cy="55" rx="32" ry="30" fill="#60a5fa" stroke="#2563eb" stroke-width="2"/>
  <ellipse cx="38" cy="52" rx="5" ry="6" fill="#1a1a1a"/>
  <ellipse cx="62" cy="52" rx="5" ry="6" fill="#1a1a1a"/>
  <ellipse cx="39" cy="50" rx="2" ry="2" fill="#fff"/>
  <ellipse cx="63" cy="50" rx="2" ry="2" fill="#fff"/>
  <path d="M 50 62 L 47 66 L 53 66 Z" fill="#f472b6"/>
  <path d="M 50 66 Q 46 72 42 70" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <path d="M 50 66 Q 54 72 58 70" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <line x1="28" y1="62" x2="42" y2="63" stroke="#1a1a1a" stroke-width="1"/>
  <line x1="28" y1="66" x2="42" y2="66" stroke="#1a1a1a" stroke-width="1"/>
  <line x1="58" y1="63" x2="72" y2="62" stroke="#1a1a1a" stroke-width="1"/>
  <line x1="58" y1="66" x2="72" y2="66" stroke="#1a1a1a" stroke-width="1"/>
</svg>`,
        
        chick: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <ellipse cx="50" cy="20" rx="6" ry="10" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/>
  <ellipse cx="50" cy="58" rx="32" ry="34" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
  <circle cx="38" cy="52" r="5" fill="#1a1a1a"/>
  <circle cx="62" cy="52" r="5" fill="#1a1a1a"/>
  <circle cx="39" cy="50" r="2" fill="#fff"/>
  <circle cx="63" cy="50" r="2" fill="#fff"/>
  <path d="M 50 62 L 42 68 L 50 72 L 58 68 Z" fill="#f97316" stroke="#c2410c" stroke-width="1.5"/>
  <ellipse cx="30" cy="65" rx="5" ry="3" fill="#fca5a5" opacity="0.6"/>
  <ellipse cx="70" cy="65" rx="5" ry="3" fill="#fca5a5" opacity="0.6"/>
</svg>`,
        
        bear: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="22" cy="25" r="12" fill="#a16207" stroke="#713f12" stroke-width="2"/>
  <circle cx="78" cy="25" r="12" fill="#a16207" stroke="#713f12" stroke-width="2"/>
  <circle cx="22" cy="25" r="6" fill="#fbbf24"/>
  <circle cx="78" cy="25" r="6" fill="#fbbf24"/>
  <ellipse cx="50" cy="58" rx="34" ry="32" fill="#a16207" stroke="#713f12" stroke-width="2"/>
  <ellipse cx="50" cy="68" rx="18" ry="14" fill="#fbbf24"/>
  <circle cx="38" cy="52" r="4" fill="#1a1a1a"/>
  <circle cx="62" cy="52" r="4" fill="#1a1a1a"/>
  <circle cx="39" cy="50" r="1.5" fill="#fff"/>
  <circle cx="63" cy="50" r="1.5" fill="#fff"/>
  <ellipse cx="50" cy="64" rx="5" ry="3.5" fill="#1a1a1a"/>
  <path d="M 50 68 Q 46 74 42 72" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <path d="M 50 68 Q 54 74 58 72" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
</svg>`,
        
        frog: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="32" cy="32" r="14" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
  <circle cx="68" cy="32" r="14" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
  <circle cx="32" cy="32" r="8" fill="#fff"/>
  <circle cx="68" cy="32" r="8" fill="#fff"/>
  <circle cx="32" cy="32" r="5" fill="#1a1a1a"/>
  <circle cx="68" cy="32" r="5" fill="#1a1a1a"/>
  <circle cx="34" cy="30" r="1.5" fill="#fff"/>
  <circle cx="70" cy="30" r="1.5" fill="#fff"/>
  <ellipse cx="50" cy="60" rx="36" ry="28" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
  <path d="M 30 68 Q 50 78 70 68" stroke="#15803d" stroke-width="2" fill="none"/>
  <ellipse cx="25" cy="65" rx="5" ry="3" fill="#86efac" opacity="0.7"/>
  <ellipse cx="75" cy="65" rx="5" ry="3" fill="#86efac" opacity="0.7"/>
</svg>`,
        
        octopus: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <ellipse cx="50" cy="45" rx="32" ry="30" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <path d="M 20 55 Q 15 75 22 90 Q 28 80 28 70" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <path d="M 32 60 Q 28 80 34 92 Q 40 82 38 72" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <path d="M 44 62 Q 44 82 48 94 Q 52 82 50 72" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <path d="M 56 62 Q 58 82 62 94 Q 64 82 60 72" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <path d="M 68 60 Q 72 80 78 92 Q 80 80 74 70" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <path d="M 80 55 Q 85 75 78 90 Q 72 80 72 70" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <ellipse cx="38" cy="45" rx="6" ry="7" fill="#fff"/>
  <ellipse cx="62" cy="45" rx="6" ry="7" fill="#fff"/>
  <circle cx="38" cy="46" r="4" fill="#1a1a1a"/>
  <circle cx="62" cy="46" r="4" fill="#1a1a1a"/>
  <circle cx="39" cy="44" r="1.5" fill="#fff"/>
  <circle cx="63" cy="44" r="1.5" fill="#fff"/>
  <ellipse cx="50" cy="58" rx="5" ry="3" fill="#be185d"/>
  <ellipse cx="28" cy="55" rx="5" ry="3" fill="#f9a8d4" opacity="0.7"/>
  <ellipse cx="72" cy="55" rx="5" ry="3" fill="#f9a8d4" opacity="0.7"/>
</svg>`,
        
        // ===== 水果 =====
        
        watermelon: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <defs>
    <linearGradient id="melonGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <path d="M 5 5 Q 95 5 95 95 L 5 95 Z" fill="#15803d" stroke="#14532d" stroke-width="2"/>
  <path d="M 10 10 Q 90 10 90 90 L 10 90 Z" fill="#f0fdf4"/>
  <path d="M 14 14 Q 86 14 86 86 L 14 86 Z" fill="url(#melonGrad)"/>
  <ellipse cx="30" cy="40" rx="2" ry="3" fill="#1a1a1a"/>
  <ellipse cx="50" cy="35" rx="2" ry="3" fill="#1a1a1a"/>
  <ellipse cx="70" cy="42" rx="2" ry="3" fill="#1a1a1a"/>
  <ellipse cx="25" cy="60" rx="2" ry="3" fill="#1a1a1a"/>
  <ellipse cx="45" cy="55" rx="2" ry="3" fill="#1a1a1a"/>
  <ellipse cx="65" cy="62" rx="2" ry="3" fill="#1a1a1a"/>
  <ellipse cx="40" cy="75" rx="2" ry="3" fill="#1a1a1a"/>
  <ellipse cx="60" cy="78" rx="2" ry="3" fill="#1a1a1a"/>
</svg>`,
        
        grape: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <defs>
    <radialGradient id="grapeGrad" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#7e22ce"/>
    </radialGradient>
  </defs>
  <path d="M 50 5 Q 65 10 70 20 Q 55 18 50 15 Q 45 18 30 20 Q 35 10 50 5 Z" fill="#16a34a" stroke="#15803d" stroke-width="1.5"/>
  <circle cx="35" cy="35" r="11" fill="url(#grapeGrad)"/>
  <circle cx="55" cy="35" r="11" fill="url(#grapeGrad)"/>
  <circle cx="75" cy="35" r="11" fill="url(#grapeGrad)"/>
  <circle cx="45" cy="52" r="11" fill="url(#grapeGrad)"/>
  <circle cx="65" cy="52" r="11" fill="url(#grapeGrad)"/>
  <circle cx="55" cy="70" r="11" fill="url(#grapeGrad)"/>
  <circle cx="35" cy="70" r="11" fill="url(#grapeGrad)"/>
  <circle cx="75" cy="70" r="11" fill="url(#grapeGrad)"/>
  <circle cx="55" cy="87" r="11" fill="url(#grapeGrad)"/>
  <circle cx="32" cy="32" r="3" fill="#fff" opacity="0.6"/>
  <circle cx="52" cy="32" r="3" fill="#fff" opacity="0.6"/>
  <circle cx="72" cy="32" r="3" fill="#fff" opacity="0.6"/>
</svg>`,
        
        lemon: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="lemonGrad" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#eab308"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="55" rx="42" ry="38" fill="url(#lemonGrad)" stroke="#ca8a04" stroke-width="2"/>
  <path d="M 8 55 Q 5 50 8 45" stroke="#ca8a04" stroke-width="2" fill="#eab308"/>
  <path d="M 92 55 Q 95 50 92 45" stroke="#ca8a04" stroke-width="2" fill="#eab308"/>
  <path d="M 60 18 Q 70 10 80 15 Q 72 22 60 22 Z" fill="#16a34a" stroke="#15803d" stroke-width="1.5"/>
  <ellipse cx="35" cy="40" rx="10" ry="6" fill="#fff" opacity="0.4"/>
</svg>`,
        
        orange: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="orangeGrad" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#fdba74"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="55" r="42" fill="url(#orangeGrad)" stroke="#c2410c" stroke-width="2"/>
  <path d="M 50 15 Q 62 8 72 14 Q 62 22 50 20 Z" fill="#16a34a" stroke="#15803d" stroke-width="1.5"/>
  <ellipse cx="35" cy="40" rx="12" ry="8" fill="#fff" opacity="0.4"/>
</svg>`,
        
        strawberry: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="strawGrad" cx="35%" cy="30%">
      <stop offset="0%" stop-color="#fda4af"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </radialGradient>
  </defs>
  <path d="M 50 20 Q 92 30 80 70 Q 65 92 50 95 Q 35 92 20 70 Q 8 30 50 20 Z" 
        fill="url(#strawGrad)" stroke="#be123c" stroke-width="2"/>
  <path d="M 50 22 Q 35 15 25 22 Q 35 25 50 25 Z" fill="#16a34a"/>
  <path d="M 50 22 Q 65 15 75 22 Q 65 25 50 25 Z" fill="#16a34a"/>
  <path d="M 50 15 Q 50 5 50 20 Z" stroke="#16a34a" stroke-width="3"/>
  <ellipse cx="35" cy="45" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="50" cy="42" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="65" cy="45" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="30" cy="60" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="45" cy="58" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="60" cy="58" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="70" cy="60" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="40" cy="75" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="55" cy="75" rx="1.5" ry="2" fill="#fef2f2"/>
  <ellipse cx="50" cy="85" rx="1.5" ry="2" fill="#fef2f2"/>
</svg>`,
        
        // ===== 覆盖层 =====
        
        'ice-1': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="iceGrad1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(186,230,253,0.7)"/>
      <stop offset="100%" stop-color="rgba(96,165,250,0.5)"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="96" height="96" rx="12" fill="url(#iceGrad1)" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
  <path d="M 20 20 L 40 35 L 30 50" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none"/>
  <path d="M 70 30 L 80 45 L 65 60" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none"/>
</svg>`,
        
        'ice-2': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="iceGrad2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(147,197,253,0.85)"/>
      <stop offset="100%" stop-color="rgba(59,130,246,0.7)"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="96" height="96" rx="12" fill="url(#iceGrad2)" stroke="rgba(255,255,255,0.9)" stroke-width="3"/>
  <path d="M 15 15 L 40 30 L 25 55 L 50 70" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" fill="none"/>
  <path d="M 70 25 L 85 45 L 70 65" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" fill="none"/>
  <path d="M 30 80 L 50 70 L 70 85" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" fill="none"/>
</svg>`,
        
        'ice-3': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="iceGrad3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(96,165,250,0.95)"/>
      <stop offset="100%" stop-color="rgba(30,64,175,0.85)"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="96" height="96" rx="12" fill="url(#iceGrad3)" stroke="rgba(255,255,255,1)" stroke-width="3.5"/>
  <path d="M 10 10 L 35 25 L 20 50 L 45 65 L 30 85" stroke="rgba(255,255,255,0.9)" stroke-width="3" fill="none"/>
  <path d="M 75 15 L 90 35 L 75 55 L 90 75" stroke="rgba(255,255,255,0.9)" stroke-width="3" fill="none"/>
  <path d="M 55 80 L 70 70 L 85 85" stroke="rgba(255,255,255,0.9)" stroke-width="3" fill="none"/>
  <circle cx="50" cy="50" r="4" fill="#fff" opacity="0.8"/>
</svg>`,
        
        vine: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 0 20 Q 25 10 50 25 Q 75 40 100 25" stroke="#16a34a" stroke-width="4" fill="none"/>
  <path d="M 0 50 Q 30 40 50 55 Q 75 70 100 55" stroke="#16a34a" stroke-width="4" fill="none"/>
  <path d="M 0 80 Q 25 70 50 85 Q 75 95 100 85" stroke="#16a34a" stroke-width="4" fill="none"/>
  <ellipse cx="20" cy="18" rx="6" ry="4" fill="#22c55e" transform="rotate(-30 20 18)"/>
  <ellipse cx="80" cy="28" rx="6" ry="4" fill="#22c55e" transform="rotate(30 80 28)"/>
  <ellipse cx="30" cy="48" rx="6" ry="4" fill="#22c55e" transform="rotate(-20 30 48)"/>
  <ellipse cx="70" cy="60" rx="6" ry="4" fill="#22c55e" transform="rotate(20 70 60)"/>
  <ellipse cx="25" cy="80" rx="6" ry="4" fill="#22c55e" transform="rotate(-30 25 80)"/>
  <ellipse cx="75" cy="88" rx="6" ry="4" fill="#22c55e" transform="rotate(30 75 88)"/>
</svg>`,
        
        chain: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="chainGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4d4d4"/>
      <stop offset="50%" stop-color="#71717a"/>
      <stop offset="100%" stop-color="#3f3f46"/>
    </linearGradient>
  </defs>
  <ellipse cx="30" cy="50" rx="12" ry="8" fill="none" stroke="url(#chainGrad)" stroke-width="6"/>
  <ellipse cx="50" cy="50" rx="12" ry="8" fill="none" stroke="url(#chainGrad)" stroke-width="6"/>
  <ellipse cx="70" cy="50" rx="12" ry="8" fill="none" stroke="url(#chainGrad)" stroke-width="6"/>
  <circle cx="30" cy="50" r="2" fill="#fff" opacity="0.6"/>
  <circle cx="50" cy="50" r="2" fill="#fff" opacity="0.6"/>
  <circle cx="70" cy="50" r="2" fill="#fff" opacity="0.6"/>
</svg>`,
  'rainbow-bird': `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="rbRainbow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff6b6b"/>
        <stop offset="20%" stop-color="#fbbf24"/>
        <stop offset="40%" stop-color="#34d399"/>
        <stop offset="60%" stop-color="#60a5fa"/>
        <stop offset="80%" stop-color="#a78bfa"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <radialGradient id="rbBody" cx="40%" cy="35%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="rbEye" cx="40%" cy="35%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </radialGradient>
    </defs>
    
    <!-- 身体：彩虹渐变圆 -->
    <circle cx="50" cy="52" r="34" fill="url(#rbRainbow)" stroke="#ffffff" stroke-width="2"/>
    
    <!-- 高光 -->
    <ellipse cx="38" cy="38" rx="14" ry="10" fill="url(#rbBody)"/>
    
    <!-- 左翅膀（小椭圆） -->
    <ellipse cx="18" cy="55" rx="10" ry="14" fill="#60a5fa" stroke="#ffffff" stroke-width="1.5" transform="rotate(-15 18 55)"/>
    
    <!-- 右翅膀 -->
    <ellipse cx="82" cy="55" rx="10" ry="14" fill="#ec4899" stroke="#ffffff" stroke-width="1.5" transform="rotate(15 82 55)"/>
    
    <!-- 眼睛（左） -->
    <circle cx="38" cy="48" r="8" fill="url(#rbEye)" stroke="#1a1a1a" stroke-width="1.5"/>
    <circle cx="38" cy="49" r="4" fill="#1a1a1a"/>
    <circle cx="40" cy="47" r="1.5" fill="#ffffff"/>
    
    <!-- 眼睛（右） -->
    <circle cx="62" cy="48" r="8" fill="url(#rbEye)" stroke="#1a1a1a" stroke-width="1.5"/>
    <circle cx="62" cy="49" r="4" fill="#1a1a1a"/>
    <circle cx="64" cy="47" r="1.5" fill="#ffffff"/>
    
    <!-- 尖嘴（金黄色三角） -->
    <path d="M 50 56 L 44 66 L 56 66 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/>
    
    <!-- 小脚丫（两个小三角） -->
    <path d="M 42 82 L 40 90 L 46 86 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/>
    <path d="M 58 82 L 60 90 L 54 86 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/>
    
    <!-- 头顶的彩虹羽冠 -->
    <path d="M 50 18 Q 45 8 38 12" stroke="#ff6b6b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 50 18 Q 50 6 50 8" stroke="#fbbf24" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 50 18 Q 55 8 62 12" stroke="#34d399" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`,
    };
    
    // ============================================================
    // Data URI 缓存
    // ============================================================
    
    const DATA_URI_CACHE = new Map();
    
    /**
     * 将原始 SVG 字符串转为 Data URI
     */
    function toDataUri(svgString) {
        // 压缩：去掉换行、多余空格
        let compressed = svgString
            .replace(/\n/g, '')
            .replace(/\s+/g, ' ')
            .replace(/>\s+</g, '><')
            .trim();
        
        // 转义特殊字符
        const encoded = encodeURIComponent(compressed)
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');
        
        return `data:image/svg+xml;charset=utf-8,${encoded}`;
    }
    
    // ============================================================
    // 公开 API
    // ============================================================
    
    return {
        /**
         * 获取 SVG 的 Data URI
         * @param {string} id - SVG 名称
         * @returns {string|null}
         */
        get(id) {
            if (!id) return null;
            
            // 缓存
            if (DATA_URI_CACHE.has(id)) {
                return DATA_URI_CACHE.get(id);
            }
            
            const raw = RAW_SVGS[id];
            if (!raw) {
                console.warn(`SVGLibrary: 未找到 "${id}"`);
                return null;
            }
            
            const uri = toDataUri(raw);
            DATA_URI_CACHE.set(id, uri);
            return uri;
        },
        
        /**
         * 解析 svg 字段
         * - '@xxx' → Data URI
         * - 'assets/xxx.svg' → 保持原样
         * - null → null
         */
        resolve(svgValue) {
            if (!svgValue) return null;
            if (typeof svgValue !== 'string') return null;
            
            // @ 前缀 → 从库中取
            if (svgValue.startsWith('@')) {
                return this.get(svgValue.slice(1));
            }
            
            // 否则视为外部路径
            return svgValue;
        },
        
        /**
         * 获取原始 SVG 字符串（用于调试或修改）
         */
        getRaw(id) {
            return RAW_SVGS[id] || null;
        },
        
        /**
         * 动态注册新 SVG
         */
        register(id, svgString) {
            RAW_SVGS[id] = svgString;
            DATA_URI_CACHE.delete(id);
        },
        
        /**
         * 列出所有可用的 SVG id
         */
        list() {
            return Object.keys(RAW_SVGS);
        },
        
        /**
         * 判断某 id 是否存在
         */
        has(id) {
            return !!RAW_SVGS[id];
        }
    };
})();

window.SVGLibrary = SVGLibrary;