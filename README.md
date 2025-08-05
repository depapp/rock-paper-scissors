# 🧠 Rock Paper Scissors Mind Reader - AI Prediction Game

An innovative real-time AI-powered prediction game where players battle against an AI that learns their patterns and tries to predict their next move in Rock Paper Scissors. Built for the Redis "Real-Time AI Innovators" challenge.

## 🎮 Game Concept

Players choose between Rock ✊, Paper 📄, or Scissors ✂️ while an AI analyzes their patterns in real-time and predicts their next choice. The AI's prediction is hidden until after the player makes their choice, creating true suspense. The AI gets smarter with each move, learning from:
- Frequency patterns
- Sequential patterns
- Complex multi-step patterns
- Meta-patterns (trying to be unpredictable)
- Psychological patterns (panic choices, pressure responses)

## 🚀 Key Features

### Real-Time AI Learning
- **Pattern Recognition**: AI analyzes player behavior in real-time
- **Adaptive Difficulty**: AI confidence grows as it learns your patterns
- **Explainable AI**: AI explains its reasoning for each prediction
- **Multiple Pattern Types**: From simple frequency to complex psychological patterns

### Redis-Powered Performance
- **Vector Search**: Semantic pattern matching for similar player behaviors
- **Semantic Caching**: Caches AI predictions for similar patterns
- **Real-time Streams**: Records every move for pattern analysis
- **Time-Series Data**: Tracks accuracy and performance metrics
- **Pub/Sub**: Real-time multiplayer updates and global statistics
- **Leaderboards**: Global rankings using Redis sorted sets

### Engaging Gameplay
- **Visual Feedback**: Real-time pattern visualization
- **Randomness Score**: Shows how unpredictable you are
- **Live Statistics**: See your patterns as the AI sees them
- **Achievement System**: Unlock achievements for various play styles

### Security & Privacy
- **Client-Side API Keys**: Each player uses their own Gemini API key
- **Local Storage Only**: API keys are stored in browser localStorage, never sent to servers
- **Per-Player AI**: Each player gets personalized AI predictions using their own API quota
- **No Server Storage**: The server never sees or stores any API keys

## 🛠️ Tech Stack

### Backend
- **Node.js + TypeScript**: Fast, type-safe server
- **Express + Socket.io**: Real-time bidirectional communication
- **Redis Cloud**: All data operations and caching
- **Google Gemini AI**: Advanced pattern analysis and explanations

### Frontend
- **Next.js 14**: React framework with App Router
- **Tailwind CSS**: Responsive, beautiful UI
- **Framer Motion**: Smooth animations
- **Zustand**: Lightweight state management

### Infrastructure
- **Monorepo**: Organized with workspaces
- **Shared Types**: Type safety across frontend/backend
- **Docker Ready**: Easy deployment

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mind-reader-battle
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create `.env.local` in `apps/server/`:
```env
# Redis Configuration
REDIS_USERNAME=your_redis_username
REDIS_PASSWORD=your_redis_password
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port

# Server Configuration
PORT=3001
NODE_ENV=development
```

**Note**: The Gemini API key is now provided by each player individually through the game interface, not through server environment variables.

4. Run the development servers:
```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 3000).

## 🎯 How to Play

1. **Get Your Gemini API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the API key

2. **Enter the Game**:
   - Choose a username
   - Paste your Gemini API key (stored locally, never sent to servers)
   - Click "Start Playing"

3. **Play the Game**:
   - **Choose**: Select Rock, Paper, or Scissors
   - **Wait**: AI secretly predicts your move
   - **Reveal**: See if the AI guessed correctly
   - **Learn**: Watch your patterns emerge in real-time
   - **Adapt**: Try to be unpredictable to beat the AI

### Game Rules
- ✊ Rock beats ✂️ Scissors
- 📄 Paper beats ✊ Rock  
- ✂️ Scissors beats 📄 Paper

## 🏆 Scoring System

- **Player scores** when AI predicts incorrectly
- **AI scores** when it predicts correctly
- **AI uses multiple strategies** to predict your next move
- **Randomness score** shows how unpredictable you are
- **Pattern detection** includes frequency, sequential, and psychological analysis

## 📊 Redis Feature Showcase

### 1. Vector Search (Pattern Matching)
```javascript
// Find players with similar patterns
const similar = await redis.ft.search('idx:profiles', 
  `*=>[KNN 10 @embedding $vec]`
)
```

### 2. Semantic Caching
```javascript
// Cache AI predictions for similar patterns
await redis.setex(`analysis:${patternHash}`, 300, prediction)
```

### 3. Real-time Streams
```javascript
// Record every move for analysis
await redis.xadd('moves:gameId', '*', moveData)
```

### 4. Time-Series Metrics
```javascript
// Track AI accuracy over time
await redis.ts.add('ai:accuracy', '*', accuracyScore)
```

### 5. Pub/Sub Communication
```javascript
// Broadcast game updates
redis.publish('game:updates', gameState)
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd apps/web
vercel
```

### Backend (Railway/Render)
1. Deploy the server app
2. Set environment variables
3. Ensure WebSocket support is enabled

## 🎮 Demo Scenarios

1. **Pattern Evolution**: Show how AI learns from sequential patterns
2. **Randomness Challenge**: Demonstrate high randomness gameplay
3. **Multiplayer Stats**: Show global statistics updating in real-time
4. **Cache Performance**: Demonstrate instant predictions from cache

## 🏅 Why This Wins

1. **Innovative AI Use**: Real-time learning with explainable AI
2. **Redis Showcase**: Uses 6+ Redis features naturally
3. **Engaging Gameplay**: Addictive "just one more round" experience
4. **Technical Excellence**: Clean architecture, type-safe, performant
5. **Accessibility**: Clear UI, helpful explanations, works for all skill levels

## 📝 License

MIT License - feel free to use this project as inspiration!

## 🙏 Acknowledgments

Built for the Redis "Real-Time AI Innovators" challenge. Special thanks to Redis for providing an amazing real-time data platform that makes this kind of innovative AI application possible.
