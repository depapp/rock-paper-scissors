import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GameChoice, PlayerPattern, AIAnalysis, GameMove } from '@mind-reader/shared';
import { GAME_CHOICES } from '@mind-reader/shared';

export class PatternAnalyzer {
  private getGeminiModel(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('No Gemini API key provided');
    }
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  // Calculate basic statistics
  private calculateFrequencies(moves: GameChoice[]): Record<GameChoice, number> {
    const frequencies: Record<GameChoice, number> = {
      rock: 0,
      paper: 0,
      scissors: 0,
    };

    moves.forEach(move => {
      frequencies[move]++;
    });

    return frequencies;
  }

  // Calculate transition probabilities
  private calculateTransitions(moves: GameChoice[]): Record<GameChoice, Record<GameChoice, number>> {
    const transitions: Record<GameChoice, Record<GameChoice, number>> = {
      rock: { rock: 0, paper: 0, scissors: 0 },
      paper: { rock: 0, paper: 0, scissors: 0 },
      scissors: { rock: 0, paper: 0, scissors: 0 },
    };

    for (let i = 0; i < moves.length - 1; i++) {
      const from = moves[i];
      const to = moves[i + 1];
      transitions[from][to]++;
    }

    return transitions;
  }

  // Calculate randomness score (0-100)
  private calculateRandomness(pattern: PlayerPattern): number {
    const { frequencies, totalMoves } = pattern;
    if (totalMoves === 0) return 100;

    // Calculate entropy
    let entropy = 0;
    GAME_CHOICES.forEach(choice => {
      const probability = frequencies[choice] / totalMoves;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });

    // Normalize to 0-100 scale (max entropy for 3 choices is log2(3))
    const maxEntropy = Math.log2(3);
    return Math.round((entropy / maxEntropy) * 100);
  }

  // Analyze patterns and create PlayerPattern object
  public analyzePattern(moves: GameMove[]): PlayerPattern {
    const choices = moves.map(m => m.choice);
    const frequencies = this.calculateFrequencies(choices);
    const transitions = this.calculateTransitions(choices);
    
    // Calculate streaks
    const streaks: Record<GameChoice, number> = {
      rock: 0, paper: 0, scissors: 0
    };
    
    let currentStreak = 1;
    for (let i = 1; i < choices.length; i++) {
      if (choices[i] === choices[i - 1]) {
        currentStreak++;
      } else {
        if (currentStreak > streaks[choices[i - 1]]) {
          streaks[choices[i - 1]] = currentStreak;
        }
        currentStreak = 1;
      }
    }
    
    // Update last streak
    if (choices.length > 0 && currentStreak > streaks[choices[choices.length - 1]]) {
      streaks[choices[choices.length - 1]] = currentStreak;
    }

    const pattern: PlayerPattern = {
      frequencies,
      transitions,
      streaks,
      totalMoves: moves.length,
      lastMoves: choices.slice(-10), // Last 10 moves
      winRate: moves.filter(m => !m.correct).length / Math.max(moves.length, 1),
      randomnessScore: 0, // Will calculate below
    };

    pattern.randomnessScore = this.calculateRandomness(pattern);
    return pattern;
  }

  // Make prediction based on patterns
  public async predictNextMove(pattern: PlayerPattern, apiKey?: string): Promise<AIAnalysis> {
    if (pattern.totalMoves < 2) {
      // First move bias - many players start with rock
      return {
        prediction: 'rock',
        confidence: 35,
        reasoning: "Most players start with rock. It's a classic opening move!",
        patternType: 'psychological',
      };
    }

    // Multiple prediction strategies
    const predictions: { choice: GameChoice; score: number; type: string }[] = [];

    // 1. Frequency-based prediction (what they play most)
    const maxFreq = Math.max(...Object.values(pattern.frequencies));
    const favoriteChoice = (Object.entries(pattern.frequencies).find(([_, freq]) => freq === maxFreq)?.[0] || 'rock') as GameChoice;
    predictions.push({ choice: favoriteChoice, score: 0.3, type: 'frequency' });

    // 2. Transition-based prediction (what they play after their last move)
    const lastMove = pattern.lastMoves[pattern.lastMoves.length - 1];
    const transitions = pattern.transitions[lastMove];
    const totalTransitions = Object.values(transitions).reduce((a, b) => a + b, 0);
    
    if (totalTransitions > 0) {
      let maxTransition = 0;
      let transitionPrediction: GameChoice = 'rock';
      
      GAME_CHOICES.forEach(choice => {
        const prob = transitions[choice] / totalTransitions;
        if (prob > maxTransition) {
          maxTransition = prob;
          transitionPrediction = choice;
        }
      });
      
      predictions.push({ choice: transitionPrediction, score: maxTransition * 0.5, type: 'sequential' });
    }

    // 3. Anti-pattern prediction (assume player is trying to be unpredictable)
    if (pattern.randomnessScore > 70) {
      // If player is very random, predict the least used choice
      const minFreq = Math.min(...Object.values(pattern.frequencies));
      const leastUsed = (Object.entries(pattern.frequencies).find(([_, freq]) => freq === minFreq)?.[0] || 'scissors') as GameChoice;
      predictions.push({ choice: leastUsed, score: 0.4, type: 'meta' });
    }

    // 4. Win-stay/lose-shift pattern
    if (pattern.lastMoves.length >= 2) {
      const lastPlayerMove = pattern.lastMoves[pattern.lastMoves.length - 1];
      const secondLastMove = pattern.lastMoves[pattern.lastMoves.length - 2];
      
      // Check if player repeated (win-stay behavior)
      if (lastPlayerMove === secondLastMove) {
        // Player repeated, they might switch now
        const alternatives = GAME_CHOICES.filter(c => c !== lastPlayerMove);
        const switchPrediction = alternatives[Math.floor(Math.random() * alternatives.length)];
        predictions.push({ choice: switchPrediction, score: 0.35, type: 'psychological' });
      }
    }

    // 5. Rotation pattern detection
    if (pattern.lastMoves.length >= 3) {
      const sequence = pattern.lastMoves.slice(-3);
      if (sequence[0] === 'rock' && sequence[1] === 'paper' && sequence[2] === 'scissors') {
        predictions.push({ choice: 'rock', score: 0.6, type: 'sequential' });
      } else if (sequence[0] === 'scissors' && sequence[1] === 'rock' && sequence[2] === 'paper') {
        predictions.push({ choice: 'scissors', score: 0.6, type: 'sequential' });
      }
    }

    // Choose the prediction with highest score
    let bestPrediction = predictions[0] || { choice: 'rock' as GameChoice, score: 0.33, type: 'frequency' };
    predictions.forEach(pred => {
      if (pred.score > bestPrediction.score) {
        bestPrediction = pred;
      }
    });

    const prediction = bestPrediction.choice;
    const confidence = Math.min(Math.round(bestPrediction.score * 100), 85);
    const patternType = bestPrediction.type as any;

    // Use Gemini for advanced pattern analysis and reasoning
    try {
      const model = this.getGeminiModel(apiKey);
      const prompt = `
        Analyze this Rock-Paper-Scissors game pattern.
        
        Player's last 10 moves: ${pattern.lastMoves.join(', ')}
        Frequency: Rock=${pattern.frequencies.rock}, Paper=${pattern.frequencies.paper}, Scissors=${pattern.frequencies.scissors}
        Randomness: ${pattern.randomnessScore}%
        Pattern type detected: ${patternType}
        
        We predict they'll play ${prediction} next.
        
        Provide a brief, engaging explanation (max 40 words) for why they might choose ${prediction}.
        Consider RPS psychology: rock=aggressive, paper=defensive, scissors=clever.
        Be conversational and slightly playful.
      `;

      const result = await model.generateContent(prompt);
      const reasoning = result.response.text().trim();

      return {
        prediction,
        confidence,
        reasoning: reasoning || `I sense you'll play ${prediction} next!`,
        patternType,
      };
    } catch (error) {
      // Fallback reasoning
      console.error('Gemini error:', error);
      const fallbackReasons: Record<string, string> = {
        frequency: `You love playing ${prediction} - it's your go-to move!`,
        sequential: `Following your pattern, ${prediction} comes next.`,
        meta: `You're being unpredictable, but I think ${prediction} is due!`,
        psychological: `After ${lastMove}, players often switch to ${prediction}.`,
        complex: `Your complex pattern points to ${prediction}.`
      };
      
      return {
        prediction,
        confidence,
        reasoning: fallbackReasons[patternType] || `I predict ${prediction}!`,
        patternType,
      };
    }
  }

  // Generate pattern hash for caching
  public generatePatternHash(pattern: PlayerPattern): string {
    const key = `${pattern.lastMoves.slice(-5).join('')}-${pattern.totalMoves}`;
    return Buffer.from(key).toString('base64');
  }
}
