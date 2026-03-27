import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, Trash2, Upload, Image as ImageIcon, Music, Video, Save, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Quiz, Question, MediaType, QuestionType } from "../types";
import { cn } from "../lib/utils";

export default function QuizCreator() {
  const { date: editDate } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState(editDate || format(new Date(), "yyyy-MM-dd"));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editDate) {
      fetchQuiz(editDate);
    } else {
      // Add initial question
      addQuestion();
    }
  }, [editDate]);

  const fetchQuiz = async (d: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, "quizzes", d);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Quiz;
        setQuestions(data.questions);
        setDate(data.date);
      }
    } catch (err) {
      console.error("Error fetching quiz:", err);
      setError("Failed to load quiz data.");
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: "",
      type: "multiple-choice",
      options: ["", ""],
      correctAnswers: [],
      timer: 20,
      points: 100,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleSave = async () => {
    if (questions.length === 0) {
      setError("Please add at least one question.");
      return;
    }

    // Validation
    for (const q of questions) {
      if (!q.text.trim()) {
        setError("All questions must have text.");
        return;
      }
      if (q.type !== "text" && q.options.some((opt) => !opt.trim())) {
        setError("All options must be filled.");
        return;
      }
      if (q.correctAnswers.length === 0) {
        setError("All questions must have at least one correct answer.");
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      // Check if quiz for this date already exists (if not editing)
      if (!editDate) {
        const docRef = doc(db, "quizzes", date);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setError("A quiz already exists for this date.");
          setSaving(false);
          return;
        }
      }

      await setDoc(doc(db, "quizzes", date), {
        date,
        questions,
      });
      navigate("/admin");
    } catch (err) {
      console.error("Error saving quiz:", err);
      setError("Failed to save quiz.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">{editDate ? "Edit Quiz" : "Create Quiz"}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-neutral-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? "Saving..." : "Save Quiz"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-neutral-200 space-y-4">
        <label className="block text-sm font-medium text-neutral-500">Quiz Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={!!editDate}
          className="w-full md:w-64 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none disabled:opacity-50"
        />
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white p-8 rounded-3xl border border-neutral-200 relative group">
            <button
              onClick={() => removeQuestion(q.id)}
              className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-neutral-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <h3 className="font-bold text-lg">Question</h3>
              </div>

              <div>
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                  placeholder="Enter your question here..."
                  className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none min-h-[100px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Media URL */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-neutral-500">Media URL (Optional)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(q.id, { mediaType: 'image' })}
                      className={cn(
                        "flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl transition-all",
                        q.mediaType === 'image' ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                      )}
                    >
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-xs">Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(q.id, { mediaType: 'audio' })}
                      className={cn(
                        "flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl transition-all",
                        q.mediaType === 'audio' ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                      )}
                    >
                      <Music className="w-6 h-6 mb-1" />
                      <span className="text-xs">Audio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(q.id, { mediaType: 'video' })}
                      className={cn(
                        "flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl transition-all",
                        q.mediaType === 'video' ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                      )}
                    >
                      <Video className="w-6 h-6 mb-1" />
                      <span className="text-xs">Video</span>
                    </button>
                  </div>
                  
                  {q.mediaType && (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={q.media || ""}
                        onChange={(e) => updateQuestion(q.id, { media: e.target.value })}
                        placeholder={`Enter ${q.mediaType} URL...`}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                  )}

                  {q.media && (
                    <div className="relative mt-4 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                      {q.mediaType === 'image' && <img src={q.media} className="w-full h-40 object-cover" referrerPolicy="no-referrer" />}
                      {q.mediaType === 'audio' && <audio src={q.media} controls className="w-full p-2" />}
                      {q.mediaType === 'video' && <video src={q.media} controls className="w-full h-40 object-cover" />}
                      <button
                        onClick={() => updateQuestion(q.id, { media: undefined, mediaType: undefined })}
                        className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Question Type & Timer */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">Question Type</label>
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType, correctAnswers: [] })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                    >
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="multiple-select">Multiple Select</option>
                      <option value="text">Text Answer</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-2">Timer (s)</label>
                      <input
                        type="number"
                        value={q.timer}
                        onChange={(e) => updateQuestion(q.id, { timer: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-2">Base Points</label>
                      <input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Options */}
              {q.type !== "text" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-neutral-500">Options (Mark correct ones)</label>
                    {q.options.length < 4 && (
                      <button
                        onClick={() => updateQuestion(q.id, { options: [...q.options, ""] })}
                        className="text-xs font-bold text-neutral-900 flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3 h-3" /> Add Option
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[optIdx] = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className={cn(
                              "w-full pl-4 pr-10 py-3 bg-neutral-50 border rounded-xl outline-none transition-all",
                              q.correctAnswers.includes(opt) ? "border-green-500 ring-1 ring-green-500" : "border-neutral-200"
                            )}
                          />
                          <button
                            onClick={() => {
                              let newCorrect = [...q.correctAnswers];
                              if (q.type === "multiple-choice") {
                                newCorrect = [opt];
                              } else {
                                if (newCorrect.includes(opt)) {
                                  newCorrect = newCorrect.filter(c => c !== opt);
                                } else {
                                  newCorrect.push(opt);
                                }
                              }
                              updateQuestion(q.id, { correctAnswers: newCorrect });
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            <CheckCircle2 className={cn(
                              "w-5 h-5 transition-colors",
                              q.correctAnswers.includes(opt) ? "text-green-500" : "text-neutral-300 hover:text-neutral-400"
                            )} />
                          </button>
                        </div>
                        {q.options.length > 2 && (
                          <button
                            onClick={() => {
                              const newOpts = q.options.filter((_, i) => i !== optIdx);
                              const newCorrect = q.correctAnswers.filter(c => newOpts.includes(c));
                              updateQuestion(q.id, { options: newOpts, correctAnswers: newCorrect });
                            }}
                            className="p-3 text-neutral-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.type === "text" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-500">Correct Answer(s)</label>
                  <input
                    type="text"
                    value={q.correctAnswers[0] || ""}
                    onChange={(e) => updateQuestion(q.id, { correctAnswers: [e.target.value] })}
                    placeholder="Enter the correct answer..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                  />
                  <p className="text-xs text-neutral-400 italic">Case-insensitive matching will be used.</p>
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={addQuestion}
          className="w-full py-6 border-2 border-dashed border-neutral-300 rounded-3xl text-neutral-500 font-bold flex items-center justify-center gap-2 hover:border-neutral-900 hover:text-neutral-900 transition-all"
        >
          <Plus className="w-6 h-6" />
          <span>Add Another Question</span>
        </button>
      </div>
    </div>
  );
}
