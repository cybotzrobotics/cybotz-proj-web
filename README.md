# CyBotz FTC Quiz Master 🤖

An interactive, AI-powered quiz platform for mastering FTC (FIRST Tech Challenge) game manuals. Features stunning 3D animations, adaptive questioning, and season-specific content.

## ✨ Features

- **🎯 AI-Generated Questions**: Custom DeepSeek model integration for accurate, context-aware questions
- **🌊 Multi-Season Support**: Easily switch between FTC seasons (Into The Deep, Decode, etc.)
- **🎮 Interactive 3D Background**: Three.js-powered animated environment with particles and floating geometry
- **⚡ Real-time Scoring**: Track progress with dynamic scoring and performance analytics
- **🏆 Gamification**: Achievements, leaderboards, and team competition features
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🎨 Cyber Aesthetic**: Custom-designed UI with neon colors, glass morphism, and smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ftcaarya/cybotz-proj-web.git
   cd cybotz-proj-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations and transitions
- **Three.js + React Three Fiber** - 3D graphics and animations
- **Lucide React** - Beautiful icons

### AI Integration
- **Ollama** - Local AI model hosting
- **DeepSeek** - Base model for fine-tuning
- **Custom Training Pipeline** - FTC-specific question generation

### Deployment
- **Vercel** - Frontend hosting
- **Railway/Heroku** - Backend API
- **ngrok/Cloudflare** - Local AI model tunneling

## 🏗️ Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── globals.css      # Global styles and animations
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Home page with main interface
├── components/          # React components
│   ├── AnimatedBackground.tsx  # 3D particle system
│   ├── QuizInterface.tsx      # Main quiz functionality
│   └── SeasonSelector.tsx     # Season switching component
└── types/              # TypeScript type definitions
```

## 🎮 Usage Guide

### Starting a Quiz
1. Select your FTC season from the dropdown
2. Click "Start Quiz" from the main menu
3. Answer questions within the time limit
4. Review explanations after each question
5. Track your progress and final score

### Season Management
- Switch between different FTC seasons seamlessly
- Each season has unique styling and content
- Questions are automatically filtered by selected season

### Performance Tracking
- Real-time scoring during quizzes
- Detailed explanations for each question
- Progress tracking across multiple sessions

## 🤖 AI Model Integration

### Current Setup (Base Model)
The app currently uses mock questions for demonstration. To integrate with your custom DeepSeek model:

1. **Ensure Ollama is running** with your fine-tuned model
2. **Set up tunneling** (ngrok/cloudflare) to expose your local model
3. **Configure API endpoints** in the backend service
4. **Update environment variables** with your model endpoints

### Custom Model Training
See the detailed training guide in the documentation for:
- Data preparation and curation
- Fine-tuning process
- Model deployment
- Quality assurance testing

## 🎨 Customization

### Themes and Colors
Edit `tailwind.config.js` to modify the color scheme:
```javascript
theme: {
  extend: {
    colors: {
      'ftc-blue': '#0066CC',
      'electric-blue': '#00D4FF',
      'cyber-purple': '#8B5CF6',
      // Add your custom colors
    }
  }
}
```

### Animations
Modify animations in `globals.css`:
```css
@keyframes yourCustomAnimation {
  /* Your animation keyframes */
}
```

### 3D Background
Customize the animated background in `AnimatedBackground.tsx`:
- Particle count and behavior
- Floating geometry shapes
- Color schemes and effects

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full feature set with 3D animations
- **Tablet**: Optimized layouts with reduced animations
- **Mobile**: Touch-friendly interface with essential features

## 🔧 Development

### Running Tests
```bash
npm run test
# or
yarn test
```

### Building for Production
```bash
npm run build
npm run start
# or
yarn build
yarn start
```

### Linting and Formatting
```bash
npm run lint
# or
yarn lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FIRST Tech Challenge** for the amazing robotics program
- **Team CyBotz** for the innovative project idea
- **Three.js Community** for the incredible 3D graphics tools
- **Next.js Team** for the powerful React framework

## 📞 Support

For questions, issues, or contributions:
- 📧 Email: [team@cybotz.com](mailto:team@cybotz.com)
- 🐛 Issues: [GitHub Issues](https://github.com/ftcaarya/cybotz-proj-web/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/ftcaarya/cybotz-proj-web/discussions)

---

Built with ❤️ by Team CyBotz for the FTC community 🤖
