import { createClient } from 'redis';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function cleanRedisData() {
  console.log('🧹 Starting Redis data cleanup...\n');

  // Create Redis client
  const redis = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  try {
    // Connect to Redis
    await redis.connect();
    console.log('✅ Connected to Redis\n');

    // Get all keys
    const keys = await redis.keys('*');
    console.log(`📊 Found ${keys.length} keys in Redis\n`);

    if (keys.length === 0) {
      console.log('✨ Redis is already clean!');
      return;
    }

    // Group keys by type
    const keyGroups = {
      users: keys.filter(k => k.startsWith('user:')),
      games: keys.filter(k => k.startsWith('game:')),
      moves: keys.filter(k => k.startsWith('moves:')),
      patterns: keys.filter(k => k.startsWith('pattern:')),
      analysis: keys.filter(k => k.startsWith('analysis:')),
      leaderboard: keys.filter(k => k === 'leaderboard'),
      profiles: keys.filter(k => k.startsWith('profile:')),
      other: keys.filter(k => !k.startsWith('user:') && 
                              !k.startsWith('game:') && 
                              !k.startsWith('moves:') && 
                              !k.startsWith('pattern:') && 
                              !k.startsWith('analysis:') && 
                              k !== 'leaderboard' &&
                              !k.startsWith('profile:'))
    };

    // Display what will be deleted
    console.log('📋 Keys to be deleted:');
    console.log(`   - Users: ${keyGroups.users.length}`);
    console.log(`   - Games: ${keyGroups.games.length}`);
    console.log(`   - Moves: ${keyGroups.moves.length}`);
    console.log(`   - Patterns: ${keyGroups.patterns.length}`);
    console.log(`   - Analysis: ${keyGroups.analysis.length}`);
    console.log(`   - Leaderboard: ${keyGroups.leaderboard.length}`);
    console.log(`   - Profiles: ${keyGroups.profiles.length}`);
    console.log(`   - Other: ${keyGroups.other.length}`);
    console.log('');

    // Ask for confirmation
    console.log('⚠️  WARNING: This will delete ALL data from Redis!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all keys
    console.log('🗑️  Deleting all keys...');
    
    for (const key of keys) {
      await redis.del(key);
    }

    console.log(`\n✅ Successfully deleted ${keys.length} keys!`);
    console.log('🎉 Redis is now clean and ready for fresh data!\n');

  } catch (error) {
    console.error('❌ Error cleaning Redis data:', error);
  } finally {
    await redis.quit();
    console.log('👋 Disconnected from Redis');
  }
}

// Run the cleanup
cleanRedisData().catch(console.error);
