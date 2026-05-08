import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    title: { type: String, required: true },
    company: { type: String, default: '' },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    salary: { type: String, default: '' },
    minSalary: { type: Number },
    maxSalary: { type: Number },
    experience: { type: String, default: '' },
    minExperience: { type: Number },
    maxExperience: { type: Number },
    applyUrl: { type: String, required: true, unique: true, index: true },
    scrapedAt: { type: Date, default: () => new Date() },

    filter: {
      passed: { type: Boolean, default: false },
      reasons: { type: [String], default: [] }
    },

    ats: {
      score: { type: Number, default: 0 },
      keywords: { type: [String], default: [] }
    },

    ai: {
      enabled: { type: Boolean, default: false },
      model: { type: String, default: '' },
      message: { type: String, default: '' },
      generatedAt: { type: Date }
    },

    status: {
      type: String,
      enum: ['new', 'shortlisted', 'applied', 'interview', 'rejected'],
      default: 'new',
      index: true
    }
  },
  { timestamps: true }
);

export const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);

