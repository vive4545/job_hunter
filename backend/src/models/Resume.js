import mongoose from 'mongoose';

const ResumeSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    headline: { type: String, default: '' },
    location: { type: String, default: '' },
    yearsOfExperience: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    text: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Resume =
  mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);

