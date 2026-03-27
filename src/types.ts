export type MediaType = 'image' | 'audio' | 'video';
export type QuestionType = 'multiple-choice' | 'text' | 'multiple-select';

export interface Question {
  id: string;
  text: string;
  media?: string;
  mediaType?: MediaType;
  type: QuestionType;
  options: string[];
  correctAnswers: string[];
  timer: number;
  points: number;
}

export interface Quiz {
  id?: string;
  date: string; // YYYY-MM-DD
  questions: Question[];
}

export interface Submission {
  id?: string;
  quizId: string;
  userId: string;
  userName: string;
  score: number;
  timeTaken: number;
  answers: string; // JSON stringified array to avoid nested array error
  timestamp: any;
}
