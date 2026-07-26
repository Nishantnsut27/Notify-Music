import mongoose from 'mongoose';
import { config } from './config.js';

export const getDatabaseState = (): {
  connected: boolean;
  state: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';
  dbName: string;
} => {
  const readyStateMap: Record<number, 'disconnected' | 'connected' | 'connecting' | 'disconnecting'> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateStr = readyStateMap[mongoose.connection.readyState] || 'unknown';
  
  return {
    connected: mongoose.connection.readyState === 1,
    state: stateStr,
    dbName: mongoose.connection.name || config.mongodbDbName,
  };
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    mongoose.connection.on('connected', () => {
      console.log(`🍃 [MongoDB] Successfully connected to database: "${mongoose.connection.name}"`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [MongoDB] Database connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [MongoDB] Database connection disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 [MongoDB] Connection re-established.');
    });

    // Handle graceful shutdown on process termination
    process.on('SIGINT', async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    console.log('⏳ [MongoDB] Connecting to Atlas cluster...');

    const db = await mongoose.connect(config.mongodbUri, {
      dbName: config.mongodbDbName,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    return db;
  } catch (error) {
    console.error('❌ [MongoDB] Initial connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('🛑 [MongoDB] Connection cleanly closed.');
  }
};
