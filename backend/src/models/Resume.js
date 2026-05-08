import mongoose from 'mongoose';

const ResumeSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    headline: { type: String, default: '' },
    location: { type: String, default: '' },
    yearsOfExperience: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    text: { type: String, default: '' },
    minSalaryPref: { type: Number, default: 0 },
    maxSalaryPref: { type: Number, default: 100 },
    minExpPref: { type: Number, default: 0 },
    maxExpPref: { type: Number, default: 50 }
  },
  { timestamps: true }
);

export const Resume =
  mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);

