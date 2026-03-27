import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection, serverTimestamp, getDocFromServer } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Quiz, Question, Submission } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Trophy, AlertCircle, ArrowRight, CheckCircle2, XCircle, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return JSON.stringify(errInfo);
}

export default function QuizAttempt() {
  const { date } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<any>("");
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (date) fetchQuiz(date);
    
    // Connection test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          setError("Firebase connection error. Please check your configuration.");
        }
      }
    };
    testConnection();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [date]);

  const fetchQuiz = async (d: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, "quizzes", d);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setQuiz(docSnap.data() as Quiz);
      } else {
        setError("Quiz not found for this date.");
      }
    } catch (err) {
      setError(handleFirestoreError(err, OperationType.GET, `quizzes/${d}`));
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    if (!userName.trim()) return;
    setIsStarted(true);
    startQuestion(0);
  };

  const startQuestion = (index: number) => {
    if (!quiz) return;
    const question = quiz.questions[index];
    setTimeLeft(question.timer);
    setSelectedAnswer(question.type === "multiple-select" ? [] : "");
    setIsAnswerSubmitted(false);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmitAnswer(null); // Time's up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmitAnswer = (forcedAnswer?: any) => {
    if (!quiz || isAnswerSubmitted) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const finalAnswer = forcedAnswer !== undefined ? forcedAnswer : selectedAnswer;
    
    setIsAnswerSubmitted(true);

    // Calculate score for this question
    if (finalAnswer !== null && finalAnswer !== undefined && finalAnswer !== "") {
      let isCorrect = false;
      if (currentQuestion.type === "text") {
        isCorrect = String(finalAnswer).toLowerCase().trim() === (currentQuestion.correctAnswers[0] || "").toLowerCase().trim();
      } else if (currentQuestion.type === "multiple-choice") {
        isCorrect = finalAnswer === currentQuestion.correctAnswers[0];
      } else if (currentQuestion.type === "multiple-select") {
        isCorrect = Array.isArray(finalAnswer) && 
                    finalAnswer.length === currentQuestion.correctAnswers.length &&
                    finalAnswer.every(a => currentQuestion.correctAnswers.includes(a));
      }

      if (isCorrect) {
        const speedBonus = (timeLeft / currentQuestion.timer) * currentQuestion.points;
        setScore((prev) => prev + Math.round(currentQuestion.points + speedBonus));
      }
    }
  };

  const handleNext = () => {
    if (!quiz) return;
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      startQuestion(currentQuestionIndex + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = async (finalAnswers: any[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsFinished(true);
  };

  const submitResults = async () => {
    if (!quiz || submitting) return;
    setSubmitting(true);
    try {
      const submission: Submission = {
        quizId: date!,
        userId: Math.random().toString(36).substr(2, 9), // Anonymous UID
        userName,
        score,
        timeTaken: 0, // Could calculate total time
        answers: JSON.stringify(answers),
        timestamp: serverTimestamp(),
      };
      await addDoc(collection(db, "submissions"), submission);
      navigate(`/leaderboard/${date}`);
    } catch (err) {
      setError(handleFirestoreError(err, OperationType.WRITE, "submissions"));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="bg-red-50 p-8 rounded-3xl border border-red-100 text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Quiz not found</h2>
        <button onClick={() => navigate("/")} className="mt-4 text-neutral-900 font-bold hover:underline">
          Go back home
        </button>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-neutral-200">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-black">Ready to Start?</h1>
            <p className="text-neutral-500 mt-2">Enter your name to join the leaderboard</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wider">Your Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. QuizMaster99"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                <Clock className="w-4 h-4" />
                <span>{quiz.questions.length} Questions</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                <Trophy className="w-4 h-4" />
                <span>Speed bonus points included!</span>
              </div>
            </div>

            <button
              onClick={startQuiz}
              disabled={!userName.trim()}
              className="w-full py-5 bg-neutral-900 text-white font-black rounded-2xl hover:bg-neutral-800 transition-all shadow-lg disabled:opacity-50"
            >
              Let's Go!
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-8">
        <div className="bg-neutral-900 text-white p-12 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-10">
            <Trophy className="w-64 h-64" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-amber-400 uppercase tracking-widest mb-4">Quiz Completed!</h2>
            <div className="text-7xl font-black mb-4">{score}</div>
            <p className="text-neutral-400">Total Points Earned</p>
            
            <button
              onClick={submitResults}
              disabled={submitting}
              className="mt-10 bg-white text-neutral-900 px-10 py-4 rounded-2xl font-black flex items-center gap-2 mx-auto hover:bg-neutral-100 transition-all shadow-xl"
            >
              <span>{submitting ? "Submitting..." : "View Leaderboard"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold px-4">Review Answers</h3>
          {quiz.questions.map((q, idx) => {
            const userAns = answers[idx];
            let isCorrect = false;
            if (userAns !== null) {
              if (q.type === "text") isCorrect = userAns.toLowerCase().trim() === q.correctAnswers[0].toLowerCase().trim();
              else if (q.type === "multiple-choice") isCorrect = userAns === q.correctAnswers[0];
              else if (q.type === "multiple-select") isCorrect = Array.isArray(userAns) && userAns.length === q.correctAnswers.length && userAns.every(a => q.correctAnswers.includes(a));
            }

            return (
              <div key={q.id} className="bg-white p-6 rounded-3xl border border-neutral-200 flex gap-4">
                <div className="shrink-0">
                  {isCorrect ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
                </div>
                <div className="space-y-2">
                  <p className="font-bold">{q.text}</p>
                  <p className="text-sm text-neutral-500">
                    Your answer: <span className={cn("font-bold", isCorrect ? "text-green-600" : "text-red-600")}>
                      {Array.isArray(userAns) ? userAns.join(", ") : (userAns || "No answer")}
                    </span>
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-neutral-500">
                      Correct answer: <span className="font-bold text-neutral-900">{q.correctAnswers.join(", ")}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8 space-y-2">
        <div className="flex justify-between text-sm font-bold text-neutral-500">
          <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <span className="flex items-center gap-1 text-amber-600">
            <Clock className="w-4 h-4" />
            {timeLeft}s
          </span>
        </div>
        <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-neutral-900"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-neutral-200 space-y-8"
        >
          {currentQuestion.media && (
            <div className="rounded-3xl overflow-hidden bg-neutral-100 border border-neutral-200 max-h-80 flex items-center justify-center">
              {currentQuestion.mediaType === 'image' && <img src={currentQuestion.media} className="max-w-full max-h-80 object-contain" />}
              {currentQuestion.mediaType === 'audio' && <audio src={currentQuestion.media} controls className="w-full p-4" />}
              {currentQuestion.mediaType === 'video' && <video src={currentQuestion.media} controls className="max-w-full max-h-80" />}
            </div>
          )}

          <h2 className="text-2xl md:text-3xl font-black leading-tight text-neutral-900">
            {currentQuestion.text}
          </h2>

          <div className="grid gap-4">
            {currentQuestion.type === "text" ? (
              <div className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  disabled={isAnswerSubmitted}
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitAnswer();
                  }}
                  className={cn(
                    "w-full p-6 bg-neutral-50 border-2 rounded-3xl outline-none transition-all text-xl font-bold",
                    isAnswerSubmitted 
                      ? (selectedAnswer.toLowerCase().trim() === currentQuestion.correctAnswers[0].toLowerCase().trim() 
                          ? "border-green-500 bg-green-50" 
                          : "border-red-500 bg-red-50")
                      : "border-neutral-200 focus:border-neutral-900"
                  )}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = currentQuestion.type === "multiple-select" 
                    ? (Array.isArray(selectedAnswer) && selectedAnswer.includes(option))
                    : selectedAnswer === option;
                  
                  const isCorrect = currentQuestion.correctAnswers?.includes(option);
                  
                  let buttonClass = "border-neutral-200 hover:border-neutral-900 hover:bg-white";
                  if (isAnswerSubmitted) {
                    if (isCorrect) buttonClass = "border-green-500 bg-green-50 ring-1 ring-green-500";
                    else if (isSelected) buttonClass = "border-red-500 bg-red-50 ring-1 ring-red-500";
                    else buttonClass = "opacity-50 border-neutral-100";
                  } else if (isSelected) {
                    buttonClass = "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900";
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswerSubmitted}
                      onClick={() => {
                        if (isAnswerSubmitted) return;
                        if (currentQuestion.type === "multiple-choice") {
                          setSelectedAnswer(option);
                        } else {
                          const currentSelection = Array.isArray(selectedAnswer) ? selectedAnswer : [];
                          const newSelection = currentSelection.includes(option)
                            ? currentSelection.filter((o: string) => o !== option)
                            : [...currentSelection, option];
                          setSelectedAnswer(newSelection);
                        }
                      }}
                      className={cn(
                        "p-6 text-left bg-neutral-50 border-2 rounded-3xl transition-all group",
                        buttonClass
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "w-10 h-10 rounded-xl border flex items-center justify-center font-black transition-all",
                          isSelected ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-400 border-neutral-200"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-lg font-bold">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-6">
              {!isAnswerSubmitted ? (
                <button
                  onClick={() => handleSubmitAnswer()}
                  disabled={currentQuestion.type === "text" ? !selectedAnswer.trim() : (Array.isArray(selectedAnswer) ? selectedAnswer.length === 0 : !selectedAnswer)}
                  className="w-full py-5 bg-neutral-900 text-white font-black rounded-2xl hover:bg-neutral-800 transition-all shadow-lg disabled:opacity-50"
                >
                  Submit Answer
                </button>
              ) : (
                <div className="space-y-4">
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center gap-3 font-bold",
                    (currentQuestion.type === "text" 
                      ? selectedAnswer.toLowerCase().trim() === currentQuestion.correctAnswers[0].toLowerCase().trim()
                      : (currentQuestion.type === "multiple-choice"
                        ? selectedAnswer === currentQuestion.correctAnswers[0]
                        : Array.isArray(selectedAnswer) && selectedAnswer.length === currentQuestion.correctAnswers.length && selectedAnswer.every(a => currentQuestion.correctAnswers.includes(a))
                      )
                    ) ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
                  )}>
                    {(currentQuestion.type === "text" 
                      ? selectedAnswer.toLowerCase().trim() === currentQuestion.correctAnswers[0].toLowerCase().trim()
                      : (currentQuestion.type === "multiple-choice"
                        ? selectedAnswer === currentQuestion.correctAnswers[0]
                        : Array.isArray(selectedAnswer) && selectedAnswer.length === currentQuestion.correctAnswers.length && selectedAnswer.every(a => currentQuestion.correctAnswers.includes(a))
                      )
                    ) ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                    <div>
                      <p>{(currentQuestion.type === "text" 
                        ? selectedAnswer.toLowerCase().trim() === currentQuestion.correctAnswers[0].toLowerCase().trim()
                        : (currentQuestion.type === "multiple-choice"
                          ? selectedAnswer === currentQuestion.correctAnswers[0]
                          : Array.isArray(selectedAnswer) && selectedAnswer.length === currentQuestion.correctAnswers.length && selectedAnswer.every(a => currentQuestion.correctAnswers.includes(a))
                        )
                      ) ? "Correct!" : "Incorrect"}</p>
                      {! (currentQuestion.type === "text" 
                        ? selectedAnswer.toLowerCase().trim() === currentQuestion.correctAnswers[0].toLowerCase().trim()
                        : (currentQuestion.type === "multiple-choice"
                          ? selectedAnswer === currentQuestion.correctAnswers[0]
                          : Array.isArray(selectedAnswer) && selectedAnswer.length === currentQuestion.correctAnswers.length && selectedAnswer.every(a => currentQuestion.correctAnswers.includes(a))
                        )
                      ) && (
                        <p className="text-sm font-medium opacity-80">Correct answer: {currentQuestion.correctAnswers.join(", ")}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-5 bg-neutral-900 text-white font-black rounded-2xl hover:bg-neutral-800 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>{currentQuestionIndex < quiz.questions.length - 1 ? "Next Question" : "Finish Quiz"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
