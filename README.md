# BILLIE JEAN · 舞步拆解教学网站

用 **GSAP + ScrollTrigger** 制作的 Michael Jackson《Billie Jean》舞蹈教学单页网站。
火柴人骨骼由正向运动学（关节角度 → 坐标）驱动，GSAP 时间线逐帧驱动，可播放 / 暂停 / 调速，步骤讲解随动画自动高亮。

## 功能

- 🕴️ **8 大舞步拆解**：太空步、脚尖站立、侧滑、转身、侧踢、脚跟脚尖滑动、前倾 45°、抓帽甩帽
- 🎬 **GSAP 火柴人演示**：每个动作可 ▶ 播放 / ⏸ 暂停 / ↺ 重置 / 0.5×-1.5× 调速
- 📋 **分步教学**：拆解步骤随动画高亮 + 要点 + 常见错误 + 冷知识
- 🎵 **跟跳时间线**：副歌 8 拍连招，带 117 BPM 鼓点循环动画
- 🥁 **节拍器**：Web Audio 实现，60–140 BPM 可调（Billie Jean 原速 117）
- 📅 **7 天练习计划**
- ✨ 滚动动画、顶部进度条、导航高亮、移动端适配、`prefers-reduced-motion` 支持

## 文件结构

```
billie-jean-dance/
├── index.html          # 页面骨架
├── css/style.css       # 舞台风视觉
└── js/
    ├── skeleton.js     # SVG 火柴人骨骼引擎（正向运动学 + 演示组件）
    ├── moves.js        # 8 大舞步数据（关键帧 + 教学文案）
    └── main.js         # GSAP 编排（Hero/滚动/节拍器/时间线/计划）
```

## 本地运行

```bash
cd billie-jean-dance
python3 -m http.server 8080
# 打开 http://127.0.0.1:8080
```

或直接双击 `index.html`（无构建步骤，纯静态）。

## npm 安装

```bash
npm install billie-jean-dance
cd node_modules/billie-jean-dance && npm start
# 打开 http://127.0.0.1:8734
```

详见 [docs/安装说明.txt](docs/安装说明.txt)。

## 技术栈

- [GSAP 3](https://gsap.com)（Tween / Timeline / ScrollTrigger / ScrollToPlugin，CDN 引入）
- 原生 JS + SVG，无构建工具
- Google Fonts：Anton（西文标题）+ Noto Sans SC（中文）

## 免责声明

本站为舞蹈爱好者致敬学习网站，与 Michael Jackson 官方无关。演示为简化示意，非专业舞蹈教学。
练习请量力而行，高风险动作（如前倾 45°）务必做好保护。
