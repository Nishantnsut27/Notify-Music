import { Schema, model } from 'mongoose';

const searchHistorySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  query: { type: String, required: true, trim: true, maxlength: 120 },
  normalizedQuery: { type: String, required: true, trim: true },
  searchedAt: { type: Date, default: Date.now },
}, { timestamps: false });

searchHistorySchema.index({ user: 1, normalizedQuery: 1 }, { unique: true });
searchHistorySchema.index({ user: 1, searchedAt: -1 });

export const SearchHistory = model('SearchHistory', searchHistorySchema);
