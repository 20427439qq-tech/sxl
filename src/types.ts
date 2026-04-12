export interface Activity {
  id: string;
  title: string;
  topic: string;
  purpose: string;
  dimensions: SelectedDimensions;
  positioning: string;
  goals: string[];
  participants: string;
  duration: string;
  venue: string;
  props: string[];
  steps: ActivityStep[];
  guideLines: string[];
  emotionPath: string[];
  risks: string[];
  reviewQuestions: string[];
  alternatives: {
    label: string;
    description: string;
  }[];
  createdAt: number;
}

export interface ActivityStep {
  title: string;
  content: string;
  guide: string;
}

export interface SelectedDimensions {
  environment: string[];
  location: string[];
  senses: string[];
  intelligence: string[];
  emotions: string[];
  learningMethods: string[];
}

export type DimensionKey = keyof SelectedDimensions;

export interface DimensionOption {
  id: string;
  label: string;
}

export interface DimensionCategory {
  key: DimensionKey;
  label: string;
  description: string;
  options: DimensionOption[];
}

export interface AIModelConfig {
  id: string;
  name: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  isDefault?: boolean;
}
