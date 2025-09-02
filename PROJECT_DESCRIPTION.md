# FTC Quiz Master - Project Description

## 🎯 Project Overview

**FTC Quiz Master** is an AI-powered, interactive quiz platform designed to help FIRST Tech Challenge (FTC) teams master their game manual knowledge through engaging, adaptive quizzes. The platform combines cutting-edge AI technology with gamified learning to create an immersive educational experience for FTC students.

## 🚀 Core Vision

Transform how FTC teams study and understand game rules by providing an intelligent, competitive platform that adapts to each student's learning pace while fostering team collaboration and healthy competition.

## ✨ Key Features

### 🤖 AI-Powered Question Generation
- **Smart Content Processing**: AI analyzes FTC game manuals and automatically generates educational quiz questions
- **Manual Upload System**: Support for uploading current and previous season game manuals
- **Adaptive Difficulty**: AI adjusts question complexity based on student performance
- **Context-Aware Questions**: Generates realistic scenarios teams encounter during competitions

### 📚 Comprehensive Quiz System
- **Multiple Question Types**: 
  - Multiple choice questions
  - True/false statements
  - Scenario-based problems
- **Rule Section Filtering**: Students can focus on specific areas:
  - Penalties and violations
  - Scoring mechanics
  - Robot design constraints
  - Game play rules
  - Awards and recognition
- **Difficulty Levels**: Easy, Medium, and Hard questions for progressive learning
- **Timed Challenges**: Configurable time limits to simulate competition pressure

### 👥 Dual Learning Modes

#### Individual Mode (Quizlet-style)
- Personal progress tracking
- Self-paced learning
- Detailed performance analytics
- Weak area identification
- Personal best score tracking

#### Team Mode (Kahoot-style) - *Future Enhancement*
- Real-time team competitions
- Live leaderboards during sessions
- Team vs. team challenges
- Collaborative learning sessions

### 📊 Advanced Progress Tracking
- **Individual Statistics**:
  - Accuracy percentages by category
  - Response time analytics
  - Streak tracking
  - Improvement trends
  - Weak area identification
- **Performance Metrics**:
  - Best scores per difficulty level
  - Category-specific performance
  - Learning velocity tracking
  - Consistency measurements

### 🏆 Competitive Elements
- **Dual Leaderboard System**:
  - **Individual Rankings**: Student vs. student competition
  - **Team Rankings**: Team vs. team performance comparison
- **Achievement System**: Badges and rewards for milestones
- **Seasonal Competitions**: Special events and challenges
- **Regional Tracking**: State-by-state team comparisons

### 👤 User Management & Analytics
- **Streamlined Registration**:
  - Student account creation with team affiliation
  - FTC team database integration via FTCScout API
  - State/region tracking for outreach metrics
- **Guest Mode**: Try-before-you-buy experience without registration
- **Team Dashboard**: Centralized view of all team member progress
- **Coach Insights**: Performance overview for mentors and coaches

## 🛠 Technical Architecture

### Frontend Stack
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom FTC theme
- **Animations**: Framer Motion for smooth interactions
- **UI Components**: Custom glassmorphism design system
- **Background Effects**: Matrix-style rainfall animation

### Backend Infrastructure
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with email/username login
- **Real-time Features**: Live leaderboard updates
- **API Integration**: FTCScout for team data validation

### AI Integration
- **Model**: Llama 3.1 8B (optimized for 32GB RAM)
- **Infrastructure**: Local Ubuntu server deployment
- **Prompt Engineering**: Custom system prompts for FTC-specific content
- **Question Quality**: Validation and fallback systems

### Data Management
- **User Profiles**: Extended authentication with team affiliations
- **Quiz Attempts**: Detailed attempt tracking with question-level analytics
- **Leaderboards**: Real-time views with ranking algorithms
- **Question Bank**: Versioned question storage with metadata

## 🎮 User Experience Flow

### New User Journey
1. **Landing Page**: Learn about platform benefits
2. **Registration**: Create account with team selection
3. **Dashboard**: Overview of progress and quick actions
4. **First Quiz**: Guided introduction to platform features
5. **Progress Tracking**: Immediate feedback and goal setting

### Returning User Flow
1. **Login**: Quick access with username/email
2. **Dashboard**: Updated stats and new challenges
3. **Quiz Selection**: Choose difficulty and focus areas
4. **Competition**: Compare with teammates and other teams
5. **Improvement**: Targeted practice in weak areas

### Guest Experience
1. **Instant Access**: No registration required
2. **Sample Quiz**: Full feature demonstration
3. **Limited Tracking**: Session-only progress
4. **Conversion**: Easy upgrade to full account

## 📈 Success Metrics & Analytics

### Student Engagement
- Quiz completion rates
- Return user frequency
- Session duration
- Feature adoption rates

### Learning Effectiveness
- Score improvement over time
- Accuracy trends by category
- Knowledge retention metrics
- Weak area remediation success

### Platform Growth
- User acquisition and retention
- Team adoption rates
- Geographic distribution
- Seasonal usage patterns

### Outreach Impact
- Teams reached by state/region
- Students engaged per team
- Competition preparation effectiveness
- Coach/mentor satisfaction

## 🗓 Development Timeline

### Phase 1: MVP Launch (3-Day Sprint) ✅
- ✅ Core quiz functionality
- ✅ User authentication and registration
- ✅ Database integration
- ✅ Individual leaderboards
- ✅ Guest mode support

### Phase 2: AI Integration (Week 1)
- ✅ Local AI server setup
- ✅ Question generation system
- ✅ Manual upload processing
- ✅ Quality validation

### Phase 3: Enhanced Features (Week 2)
- Team mode implementation
- Advanced analytics dashboard
- Coach/mentor tools
- Mobile app optimization

### Phase 4: Scale & Polish (Week 3)
- Performance optimization
- Advanced AI features
- Community features
- Beta testing with real teams

## 🎯 Target Audience

### Primary Users
- **FTC Students** (Ages 12-18): Core platform users seeking game manual mastery
- **Team Mentors/Coaches**: Progress monitoring and team management
- **FTC Teams**: Collaborative learning and competition preparation

### Secondary Users
- **FTC Organizations**: Regional and state-level administrators
- **Educational Institutions**: Schools with FTC programs
- **FIRST Staff**: Platform analytics and outreach metrics

## 🔮 Future Enhancements

### Advanced AI Features
- Personalized learning paths
- Predictive difficulty adjustment
- Natural language question input
- Multi-language support

### Collaboration Tools
- Team study sessions
- Peer tutoring systems
- Knowledge sharing forums
- Mentor-student communication

### Competition Integration
- Event-specific quizzes
- Live competition prep
- Post-competition analysis
- Tournament brackets

### Platform Expansion
- FRC (FIRST Robotics Competition) support
- FLL (FIRST LEGO League) adaptation
- Custom organization deployments
- White-label solutions

## 🏆 Competitive Advantages

1. **FTC-Specific Focus**: Purpose-built for FTC teams unlike generic quiz platforms
2. **AI-Powered Content**: Automatically generates relevant, up-to-date questions
3. **Dual Competition Model**: Both individual and team-based learning
4. **Real-time Analytics**: Immediate feedback and progress tracking
5. **Community-Driven**: Built by FTC teams, for FTC teams
6. **Comprehensive Coverage**: Entire game manual integration
7. **Adaptive Learning**: Personalizes to each student's pace and needs

## 📋 Current Implementation Status

### ✅ Completed Features
- **User Authentication**: Registration with team affiliation via FTCScout API
- **Quiz Engine**: Dynamic question loading with timer and scoring
- **Database Integration**: Supabase backend with RLS security
- **Leaderboard System**: Individual and team rankings with real-time updates
- **Responsive Design**: Mobile-first approach with glassmorphism UI
- **Guest Mode**: Full quiz experience without registration
- **Progress Tracking**: Score history and best score tracking

### 🔧 Technical Implementation Details

#### Database Schema
```sql
-- User profiles with team affiliations
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT,
  team_number INTEGER,
  team_name TEXT,
  team_key TEXT
);

-- Quiz questions with metadata
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  category TEXT,
  difficulty TEXT,
  season TEXT
);

-- Quiz attempts with detailed tracking
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  season TEXT,
  score INTEGER,
  total_questions INTEGER,
  questions_answered JSONB,
  time_taken INTEGER,
  is_guest BOOLEAN
);
```

#### Component Architecture
```
src/
├── components/
│   ├── QuizInterface.tsx      # Main quiz functionality
│   ├── RegisterTeam.tsx       # User registration with team search
│   ├── LoginTeam.tsx          # Authentication with forgot password
│   ├── Dashboard.tsx          # User dashboard with stats
│   ├── Leaderboard.tsx        # Individual and team rankings
│   └── AnimatedBackground.tsx # Matrix rain effect
├── app/
│   ├── page.tsx              # Redirect to login
│   ├── login/page.tsx        # Login page
│   ├── team/page.tsx         # Registration page
│   ├── dashboard/page.tsx    # User dashboard
│   └── quiz/page.tsx         # Quiz interface
└── utils/
    └── supabaseClient.ts     # Database configuration
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- 32GB RAM Ubuntu server (for AI features)

### Installation
```bash
# Clone repository
git clone https://github.com/your-repo/ftc-quiz-master.git
cd ftc-quiz-master

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your Supabase credentials

# Set up database
# Run SQL scripts in Supabase dashboard

# Start development server
npm run dev
```

### Database Setup
1. Create Supabase project
2. Run provided SQL scripts to create tables and views
3. Configure Row Level Security policies
4. Insert sample questions for testing

## 📊 Current Metrics (Beta Phase)

### Platform Statistics
- **Questions**: 10+ sample questions (Into The Deep season)
- **Users**: Ready for unlimited student registration
- **Teams**: FTCScout API integration for 20,000+ teams
- **Performance**: <2s quiz question loading, real-time leaderboard updates

### Technical Performance
- **Frontend**: Next.js 14 with TypeScript for type safety
- **Backend**: Supabase with automatic scaling
- **Database**: PostgreSQL with optimized queries
- **Security**: Row Level Security, JWT authentication

---

**FTC Quiz Master** represents the next evolution in competitive robotics education, combining proven pedagogical approaches with modern technology to create an engaging, effective learning platform that prepares FTC teams for success while building a stronger, more knowledgeable robotics community.

## 📞 Contact & Support

For questions, suggestions, or technical support:
- **GitHub Issues**: [Repository Issues](https://github.com/your-repo/ftc-quiz-master/issues)
- **Email**: support@ftcquizmaster.com
- **Discord**: FTC Quiz Master Community Server

---

*Built with ❤️ by FTC teams, for FTC teams.*
