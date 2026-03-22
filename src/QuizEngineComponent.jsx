import { useEffect, useState, useRef, useMemo } from "react";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";
import questions from "./Data/t1.json";
import "./QuizEngine.css";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";

// Simple shuffle function
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const QuizQuestion = ({ data, selected, locked, onSelect, optionLetters }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const optionsText = data.options
      .map((opt, i) => `${optionLetters[i]}) ${opt}`)
      .join("\n");
    const fullText = `Question:\n${data.question}\n\nOptions:\n${optionsText}`;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="question-container">
      <div className="question-header">
        <div className="question-meta">
          <span className="question-number">Question {data.displayId}</span>
          <span className="question-topic">
            <i className="fas fa-book-open"></i> Quiz Engine
          </span>
        </div>
        <button
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={copyToClipboard}
          aria-label={copied ? "Copied to clipboard" : "Copy question"}
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div className="question-card">
        <div className="question-content">
          <div className="question-text">
            <Latex>{data.question}</Latex>
          </div>

          <div className="options-container">
            {data.options.map((opt, i) => {
              const isCorrect = opt === data.correctAnswer;
              const isSelected = opt === selected;
              let className = "option";
              if (locked) {
                if (isCorrect) className += " correct";
                else if (isSelected) className += " wrong";
              } else if (isSelected) className += " selected";

              return (
                <button
                  key={i}
                  className={className}
                  onClick={() => !locked && onSelect(opt)}
                  disabled={locked}
                  aria-label={`Select option ${optionLetters[i]}: ${opt}`}
                >
                  <div className="option-indicator">
                    <span className="option-letter">{optionLetters[i]}</span>
                  </div>
                  <div className="option-content">
                    <Latex>{opt}</Latex>
                  </div>
                  {locked && isCorrect && (
                    <div className="option-feedback">
                      <i className="fas fa-check"></i>
                    </div>
                  )}
                  {locked && isSelected && !isCorrect && (
                    <div className="option-feedback wrong">
                      <i className="fas fa-times"></i>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {locked && data.explanation && (
            <div className="explanation">
              <div className="explanation-header">
                <i className="fas fa-info-circle"></i>
                <h4>Explanation</h4>
              </div>
              <p><Latex>{data.explanation}</Latex></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function QuizEngine({ testData, onBack }) {
  const STORAGE_KEY = `mathx_quiz_state_${testData?.id || 'default'}`;
  const timerRef = useRef(null);
  const { user } = useAuth();

  const [quizData, setQuizData] = useState([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showFinishWarning, setShowFinishWarning] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Analytics State
  const [questionAnalysis, setQuestionAnalysis] = useState({}); // { index: { timeSpent: 0, answer: '' } }
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Reset question timer when index changes
  useEffect(() => {
    if (!quizCompleted) {
      setQuestionStartTime(Date.now());
    }
  }, [index, quizCompleted]);

  // Process questions on load
  useEffect(() => {
    const processQuestions = async () => {
      try {
        setIsLoading(true);

        let rawQuestions = [];
        
        // 1. Try fetching from Supabase if testData.id is a real UUID
        if (testData?.id && testData.id.length > 10) {
          console.log(`📡 Fetching questions from DB for Test ID: ${testData.id}`);
          const { data: dbQuestions, error: dbError } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', testData.id);

          if (!dbError && dbQuestions && dbQuestions.length > 0) {
            rawQuestions = dbQuestions.map((q, idx) => ({
              id: q.id,
              question: q.question_text,
              options: q.options,
              correctAnswer: q.correct_answer,
              explanation: q.explanation || ""
            }));
          } else {
            console.warn('⚠️ DB fetch failed or empty, falling back to local data');
          }
        }

        // 2. Fallback to local Data if DB fetch didn't yield results
        if (rawQuestions.length === 0) {
          const sourceData = testData?.data || questions;
          if (Array.isArray(sourceData)) {
            rawQuestions = sourceData;
          } else if (sourceData && typeof sourceData === 'object') {
            if (sourceData.questions && Array.isArray(sourceData.questions)) {
              rawQuestions = sourceData.questions;
            } else if (Object.keys(sourceData).every(key => !isNaN(key))) {
              rawQuestions = Object.values(sourceData);
            } else if (sourceData.question || sourceData.text || sourceData.problem) {
              rawQuestions = [sourceData];
            }
          }
        }

        if (rawQuestions.length === 0) {
          rawQuestions = [
            {
              id: 1,
              question: "What is the capital of France?",
              options: ["London", "Berlin", "Paris", "Madrid"],
              answer: "Paris",
              explanation: "Paris is the capital and most populous city of France."
            },
            {
              id: 2,
              question: "Which planet is known as the Red Planet?",
              options: ["Earth", "Mars", "Jupiter", "Venus"],
              answer: "Mars",
              explanation: "Mars is often referred to as the Red Planet due to its reddish appearance."
            },
            {
              id: 3,
              question: "What is 2 + 2?",
              options: ["3", "4", "5", "6"],
              answer: "4",
              explanation: "Basic arithmetic: 2 + 2 = 4"
            }
          ];
        }

        // Process each question
        const processedQuestions = rawQuestions.map((q, idx) => {
          // Get question text
          const questionText = q.question || q.text || q.problem || `Question ${idx + 1}`;

          // Get options
          let options = [];
          if (q.options && Array.isArray(q.options)) {
            options = [...q.options];
          } else if (q.choices && Array.isArray(q.choices)) {
            options = [...q.choices];
          } else if (q.optionA && q.optionB) {
            options = [
              q.optionA,
              q.optionB,
              q.optionC || `Option C`,
              q.optionD || `Option D`
            ];
          } else if (q.a && q.b) {
            options = [
              q.a,
              q.b,
              q.c || `Option C`,
              q.d || `Option D`
            ];
          } else {
            options = [`Option A`, `Option B`, `Option C`, `Option D`];
          }

          // Ensure we have exactly 4 options
          while (options.length < 4) {
            options.push(`Option ${options.length + 1}`);
          }

          // Get correct answer by honoring the strict schema mapping: correctAnswerIndex
          let correctAnswer;
          if (q.correctAnswerIndex !== undefined && options[q.correctAnswerIndex] !== undefined) {
             correctAnswer = options[q.correctAnswerIndex];
          } else {
             correctAnswer = q.answer || q.correct || q.correctAnswer || q.solution;
             if (!correctAnswer && options.length > 0) {
               correctAnswer = options[0]; // Fallback
             }
          }

          return {
            ...q,
            id: idx + 1,
            displayId: idx + 1,
            question: questionText,
            options: options,
            correctAnswer: correctAnswer,
            explanation: q.explanation || q.solution || ""
          };
        });

        // Preserve exact sequential order for both questions and options
        const finalQuestions = processedQuestions.map((q, idx) => {
          return {
            ...q,
            id: idx + 1,
            displayId: idx + 1,
            options: q.options,
            correctAnswer: q.correctAnswer
          };
        });

        setQuizData(finalQuestions);

        // Set initial time
        const initialTime = finalQuestions.length > 0 ? (finalQuestions.length - 1) * 60 : 300;
        setTimeRemaining(initialTime);

        // Load saved state
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.quizData && Array.isArray(parsed.quizData) && parsed.quizData.length === finalQuestions.length) {
              setIndex(parsed.index || 0);
              setAnswered(parsed.answered || {});
              setQuizCompleted(parsed.quizCompleted || false);
              setTimeSpent(parsed.timeSpent || 0);
              setTimeRemaining(parsed.timeRemaining || initialTime);
            }
          } catch (e) {
            console.error("Error loading saved state:", e);
          }
        }

      } catch (err) {
        console.error("Error processing questions:", err);

        // Create fallback questions
        const fallbackQuestions = [
          {
            id: 1,
            displayId: 1,
            question: "Sample Question 1: What is React?",
            options: ["A library", "A framework", "A programming language", "A database"],
            correctAnswer: "A library",
            explanation: "React is a JavaScript library for building user interfaces."
          },
          {
            id: 2,
            displayId: 2,
            question: "Sample Question 2: What is JSX?",
            options: ["JavaScript XML", "Java Syntax Extension", "JavaScript Extension", "Java XML"],
            correctAnswer: "JavaScript XML",
            explanation: "JSX is a syntax extension for JavaScript used with React."
          }
        ];

        setQuizData(fallbackQuestions);
        setTimeRemaining(120);
      } finally {
        setIsLoading(false);
      }
    };

    processQuestions();
  }, []);

  // Save state
  useEffect(() => {
    if (quizData.length > 0) {
      const data = {
        quizData,
        index,
        answered,
        quizCompleted,
        timeSpent,
        timeRemaining
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [quizData, index, answered, quizCompleted, timeSpent, timeRemaining]);

  // Timer
  useEffect(() => {
    if (!quizCompleted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setQuizCompleted(true);
            return 0;
          }
          return prev - 1;
        });
        setTimeSpent(prev => prev + 1);
      }, 1000);
    } else if (timeRemaining === 0 && !quizCompleted) {
      setQuizCompleted(true);
    }

    return () => clearInterval(timerRef.current);
  }, [quizCompleted, timeRemaining]);

  // Calculate stats
  const totalQuestions = quizData.length;
  const currentQuestion = quizData[index];
  const answeredCount = Object.keys(answered).length;
  const allAttempted = answeredCount === totalQuestions && totalQuestions > 0;

  const score = useMemo(() => {
    return Object.entries(answered).reduce((acc, [idx, choice]) => {
      const question = quizData[parseInt(idx)];
      return question?.correctAnswer === choice ? acc + 1 : acc;
    }, 0);
  }, [answered, quizData]);

  const progress = totalQuestions > 0 ? ((index + 1) / totalQuestions) * 100 : 0;
  const accuracy = answeredCount > 0 ? (score / answeredCount) * 100 : 0;

  // ==========================================
  // ANALYTICS & SAVING LOGIC
  // ==========================================

  // 1. This function is triggered IMMEDIATELY after every single question is answered
  const saveSingleQuestionResult = async (questionIndex, selectedOption, timeSpentSeconds) => {
    if (!user) return; // If not logged in, we can't save anything

    const question = quizData[questionIndex];
    const isCorrect = selectedOption === question.correctAnswer;
    const xpEarned = isCorrect ? 10 : 0; // Award 10 XP per correct question

    try {
      console.log(`📡 Saving results for Question ${questionIndex + 1}...`);

      // A. Save the individual question analytics payload
      const { error: analyticsError } = await supabase
        .from('question_analytics')
        .insert({
          // Note: We don't have a specific result_id yet because the test isn't finished,
          // so we rely on user_id and test_id to track these standalone metrics
          user_id: user.sub,
          test_id: testData?.id || '00000000-0000-0000-0000-000000000001',
          question_id: question.id.length > 20 ? question.id : null,
          user_answer: selectedOption,
          is_correct: isCorrect,
          time_spent_seconds: timeSpentSeconds
        });

      if (analyticsError) {
        console.error("Failed to save question analytics:", analyticsError);
      }

      // B. Increment the User's XP Immediately if they got it right
      if (isCorrect) {
        const { error: rpcError } = await supabase.rpc('add_xp', { xp_amount: xpEarned });
        
        if (rpcError) {
          console.error("Failed to add XP via RPC:", rpcError);
        } else {
          console.log(`⭐ +${xpEarned} XP Awarded securely!`);
        }
      }
    } catch (error) {
      console.error('Error during single question save:', error.message);
    }
  };

  // 2. This function is triggered ONLY when the entire quiz is finished
  const saveFinalTestResult = async () => {
    if (!user || !quizCompleted) return;
    
    try {
      console.log(`🏆 Saving final test completion record...`);
      
      // We log the final aggregate score into test_results for the heatmap & dashboard
      const { error: resultError } = await supabase
        .from('test_results')
        .insert({
          user_id: user.sub,
          test_id: testData?.id || '00000000-0000-0000-0000-000000000001',
          score: score,
          total_questions: totalQuestions,
        });

      if (resultError) throw resultError;
      console.log('Final result saved successfully!');
    } catch (error) {
      console.error('Error saving final test result:', error.message);
    }
  };

  // Trigger the final save when 'quizCompleted' flips to true
  useEffect(() => {
    if (quizCompleted) {
      saveFinalTestResult();
    }
  }, [quizCompleted]);

  // Event handlers
  const handleSelect = (option) => {
    if (answered[index]) return; // Prevent changing answers once locked
    
    // 1. Calculate how long they spent on this exact question
    const endTime = Date.now();
    const timeSpent = Math.max(Math.floor((endTime - questionStartTime) / 1000), 1);
    
    // 2. Save into local React State
    setQuestionAnalysis(prev => ({
      ...prev,
      [index]: {
        timeSpent: timeSpent, // Minimum 1 second
        answer: option
      }
    }));
    setAnswered(prev => ({ ...prev, [index]: option }));
    
    // 3. IMMEDIATELY Fire the Database Save Function
    saveSingleQuestionResult(index, option, timeSpent);
  };

  const nextQuestion = () => {
    if (index + 1 < totalQuestions) setIndex(i => i + 1);
  };

  const prevQuestion = () => {
    if (index > 0) setIndex(i => i - 1);
  };

  const finishQuiz = () => {
    if (allAttempted) {
      setQuizCompleted(true);
    } else {
      setShowFinishWarning(true);
    }
  };

  const resetQuiz = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    
    // Graceful native state reset instead of window.reload()
    setIndex(0);
    setAnswered({});
    setQuizCompleted(false);
    setTimeSpent(0);
    
    const initialTime = quizData.length > 0 ? (quizData.length - 1) * 60 : 300;
    setTimeRemaining(initialTime);
    
    setQuestionAnalysis({});
    setQuestionStartTime(Date.now());
    setShowResetConfirm(false);
  };

  const jumpToQuestion = (idx) => {
    if (idx >= 0 && idx < totalQuestions) {
      setIndex(idx);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "?" && e.shiftKey) {
        setShowKeyboardShortcuts(prev => !prev);
        return;
      }

      if (e.key === "0") {
        resetQuiz();
        return;
      }

      if (quizCompleted) return e.key === 'r' && resetQuiz();

      if (currentQuestion && ["1", "2", "3", "4"].includes(e.key)) {
        const optIndex = parseInt(e.key) - 1;
        if (currentQuestion.options && currentQuestion.options[optIndex]) {
          handleSelect(currentQuestion.options[optIndex]);
        }
      }

      if ((e.key === "Enter" || e.key === " ") && answered[index]) nextQuestion();
      if (e.key === "ArrowRight") nextQuestion();
      if (e.key === "ArrowLeft") prevQuestion();

      if (e.key >= "1" && e.key <= "9" && e.altKey) {
        const questionNum = parseInt(e.key) - 1;
        if (questionNum < totalQuestions) {
          jumpToQuestion(questionNum);
        }
      }

      if (e.key === "f" && e.ctrlKey) {
        e.preventDefault();
        finishQuiz();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, answered, quizCompleted, currentQuestion, allAttempted]);

  // Helper functions
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    const initialTime = quizData.length > 0 ? (quizData.length - 1) * 60 : 300;
    const percentage = (timeRemaining / initialTime) * 100;
    if (percentage <= 25) return "#ef4444";
    if (percentage <= 50) return "#f59e0b";
    return "#0ea5e9";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading-screen">
            <div className="loading-spinner">
              <i className="fas fa-brain fa-spin"></i>
            </div>
            <h3>Loading Quiz...</h3>
            <p>Shuffling questions and options</p>
          </div>
        </div>
      </div>
    );
  }

  // No questions state
  if (totalQuestions === 0) {
    return (
      <div className="app">
        <div className="container">
          <div className="error-screen">
            <div className="error-icon">
              <i className="fas fa-question-circle"></i>
            </div>
            <h3>No Questions Found</h3>
            <p>Please check your JSON file format.</p>
            <button
              className="action-btn primary"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-redo"></i> Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeColor = getTimeColor();
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="app">
      <div className="premium-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo-container" onClick={onBack} style={{ cursor: 'pointer' }}>
            <div className="logo">
              <i className="fas fa-brain-circuit"></i>
            </div>
            <div className="logo-text">
              <span className="logo-main">MathX</span>
              <span className="logo-sub">Assessment 1.0</span>
            </div>
          </div>

          <div className="user-info">
            <div className="user-details-group">
              <div className="user-time">
                <i className="fas fa-clock" style={{ color: timeColor }}></i>
                <span>{formatTime(timeRemaining)}</span>
              </div>
              <div className="session-tag">Live Session</div>
            </div>
            {user ? (
              <img src={user.picture} alt="Avatar" className="user-avatar-small" />
            ) : (
              <div className="user-avatar-small">
                <i className="fas fa-user-graduate"></i>
              </div>
            )}
          </div>
        </header>

        {/* Progress Dashboard */}
        <div className="progress-section">
          <div className="progress-header">
            <div className="progress-info">
              <div className="progress-label">
                <span>Question {index + 1} of {totalQuestions}</span>
                <span className="progress-percentage">{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="progress-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-star"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{score}</div>
                  <div className="stat-label">Score</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-bullseye"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{accuracy.toFixed(1)}%</div>
                  <div className="stat-label">Accuracy</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{answeredCount}/{totalQuestions}</div>
                  <div className="stat-label">Answered</div>
                </div>
              </div>

              <div className={`stat-card ${allAttempted ? 'all-attempted' : ''}`}>
                <div className="stat-icon">
                  <i className={`fas ${allAttempted ? 'fa-check-double' : 'fa-hourglass-half'}`}></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {allAttempted ? "Ready" : "Pending"}
                  </div>
                  <div className="stat-label">Status</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="main-content">
          {!quizCompleted ? (
            <>
              {currentQuestion && (
                <QuizQuestion
                  data={currentQuestion}
                  selected={answered[index]}
                  locked={!!answered[index]}
                  onSelect={handleSelect}
                  optionLetters={optionLetters}
                />
              )}

              {/* Quick Navigation */}
              <div className="quick-nav">
                <div className="nav-header">
                  <h4><i className="fas fa-compass"></i> Navigation</h4>
                  <span className="nav-subtitle">
                    {allAttempted ? "✓ All questions attempted" : `${answeredCount}/${totalQuestions} attempted`}
                  </span>
                </div>
                <div className="question-grid">
                  {quizData.map((q, idx) => (
                    <button
                      key={idx}
                      className={`nav-dot ${idx === index ? 'active' : ''} ${answered[idx] ? 'answered' : ''} ${answered[idx] === q.correctAnswer ? 'correct' : answered[idx] ? 'incorrect' : ''}`}
                      onClick={() => jumpToQuestion(idx)}
                      title={`Question ${idx + 1}`}
                      aria-label={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                      {answered[idx] === q.correctAnswer && (
                        <i className="fas fa-check"></i>
                      )}
                      {answered[idx] && answered[idx] !== q.correctAnswer && (
                        <i className="fas fa-times"></i>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="action-bar">
                <button
                  className="action-btn secondary"
                  onClick={prevQuestion}
                  disabled={index === 0}
                >
                  <i className="fas fa-chevron-left"></i>
                  Previous
                </button>

                <div className="action-group">
                  <button
                    className="icon-btn"
                    onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                    title="Keyboard Shortcuts"
                  >
                    <i className="fas fa-keyboard"></i>
                  </button>
                  <button
                    className="icon-btn"
                    onClick={resetQuiz}
                    title="Reset Quiz"
                  >
                    <i className="fas fa-redo"></i>
                  </button>
                  <button
                    className={`icon-btn finish-btn ${allAttempted ? 'ready' : ''}`}
                    onClick={finishQuiz}
                    title={allAttempted ? "Submit Quiz (Ctrl+F)" : "Finish all questions to submit"}
                    disabled={!allAttempted}
                  >
                    <i className="fas fa-flag-checkered"></i>
                  </button>
                </div>

                <button
                  className="action-btn primary"
                  onClick={nextQuestion}
                  disabled={!answered[index]}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </>
          ) : (
            <div className="results-screen">
              <div className="results-header">
                <div className="results-icon">
                  <i className="fas fa-trophy"></i>
                </div>
                <h2>Assessment Complete</h2>
                <p className="results-subtitle">
                  {timeRemaining === 0
                    ? "Time's up! Quiz submitted automatically."
                    : allAttempted
                      ? "Quiz submitted successfully."
                      : "Quiz submitted with unanswered questions."}
                </p>
              </div>

              <div className="results-grid">
                <div className="result-card highlight">
                  <div className="result-icon">
                    <i className="fas fa-trophy"></i>
                  </div>
                  <div className="result-content">
                    <div className="result-value">{score}<span className="result-denominator">/{totalQuestions}</span></div>
                    <div className="result-label">Score</div>
                  </div>
                </div>

                <div className="result-card xp-award">
                  <div className="result-icon">
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div className="result-content">
                    <div className="result-value">+{score * 10}</div>
                    <div className="result-label">XP Earned</div>
                  </div>
                </div>

                <div className="result-card">
                  <div className="result-icon">
                    <i className="fas fa-stopwatch"></i>
                  </div>
                  <div className="result-content">
                    <div className="result-value">{formatTime(timeSpent)}</div>
                    <div className="result-label">Time</div>
                  </div>
                </div>

                <div className="result-card">
                  <div className="result-icon">
                    <i className="fas fa-bullseye"></i>
                  </div>
                  <div className="result-content">
                    <div className="result-value">{accuracy.toFixed(0)}%</div>
                    <div className="result-label">Accuracy</div>
                  </div>
                </div>
              </div>

              <div className="results-actions">
                <button
                  className="results-btn outline"
                  onClick={() => { setQuizCompleted(false); setIndex(0); }}
                >
                  <i className="fas fa-eye"></i>
                  Review Answers
                </button>
                <button
                  className="results-btn solid"
                  onClick={resetQuiz}
                >
                  <i className="fas fa-sync"></i>
                  New Attempt
                </button>
                <button
                  className="results-btn share"
                  onClick={() => navigator.clipboard.writeText(`MathX Quiz: ${score}/${totalQuestions} (${accuracy.toFixed(1)}% accuracy) in ${formatTime(timeSpent)}`)}
                >
                  <i className="fas fa-share-alt"></i>
                  Share
                </button>
                <button
                  className="results-btn primary"
                  style={{ background: '#0ea5e9', color: 'white' }}
                  onClick={onBack}
                >
                  <i className="fas fa-home"></i>
                  Dashboard
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcuts && (
          <div className="modal-overlay" onClick={() => setShowKeyboardShortcuts(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><i className="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowKeyboardShortcuts(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-content">
                <div className="shortcut-item">
                  <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd>
                  <span>Select options A-D</span>
                </div>
                <div className="shortcut-item">
                  <kbd>←</kbd><kbd>→</kbd>
                  <span>Navigate questions</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Enter</kbd><kbd>Space</kbd>
                  <span>Confirm & proceed</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Alt</kbd> + <kbd>1-9</kbd>
                  <span>Jump to question</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>F</kbd>
                  <span>Finish quiz (when all attempted)</span>
                </div>
                <div className="shortcut-item">
                  <kbd>0</kbd>
                  <span>Reset quiz</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Shift</kbd> + <kbd>?</kbd>
                  <span>Toggle help</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Finish Warning Modal */}
        {showFinishWarning && (
          <div className="modal-overlay" onClick={() => setShowFinishWarning(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }}></i> Incomplete Quiz</h3>
                <button className="modal-close" onClick={() => setShowFinishWarning(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <p>You have answered <strong>{answeredCount}</strong> out of <strong>{totalQuestions}</strong> questions.</p>
                <p style={{ marginTop: '8px' }}>Please attempt all questions before submitting.</p>
              </div>
              <div className="modal-actions">
                <button className="modal-btn primary" onClick={() => setShowFinishWarning(false)}>
                  <i className="fas fa-arrow-left"></i> Continue Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><i className="fas fa-redo" style={{ color: '#ef4444' }}></i> Reset Quiz?</h3>
                <button className="modal-close" onClick={() => setShowResetConfirm(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to reset? <strong>All progress will be lost</strong> and questions will be re-shuffled.</p>
              </div>
              <div className="modal-actions">
                <button className="modal-btn cancel" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
                <button className="modal-btn danger" onClick={confirmReset}>
                  <i className="fas fa-trash-alt"></i> Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-brand">
              <i className="fas fa-brain"></i>
              <span>MathX</span>
            </div>
            <div className="footer-info">
              <span className="footer-shuffle-info">
                <i className="fas fa-random"></i> © 2026 MathX. All rights reserved.
              </span>
            </div>
            <div className="footer-links">
              <button className="footer-link">
                <i className="fas fa-question-circle"></i> Help
              </button>
              <button className="footer-link">
                <i className="fas fa-chart-bar"></i> Analytics
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// © All Rights Reserved. MathX 2026 
// Team MathX

