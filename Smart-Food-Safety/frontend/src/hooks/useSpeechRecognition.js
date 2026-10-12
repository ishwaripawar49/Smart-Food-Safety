import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Supported Speech Recognition language codes
 * Marathi: mr-IN
 * Hindi: hi-IN
 * English (India): en-IN
 */
export const SPEECH_LANG_MAP = {
  mr: "mr-IN",
  hi: "hi-IN",
  en: "en-IN",
};

/**
 * Text-to-Speech instructions for accessibility
 */
export const SPOKEN_INSTRUCTIONS = {
  mr: "कृपया तुमची तक्रार सांगा.",
  hi: "कृपया अपनी शिकायत बताएं।",
  en: "Please describe your complaint.",
};

/**
 * Custom hook for multilingual speech recognition and optional speech synthesis.
 * Safe for all browser environments (SSR safe, falls back gracefully).
 */
export function useSpeechRecognition({ language = "mr" } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Check SpeechRecognition browser API support
  const isSupported =
    typeof window !== "undefined" &&
    Boolean(
      window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        window.mozSpeechRecognition ||
        window.msSpeechRecognition
    );

  // Check SpeechSynthesis browser API support
  const isSynthesisSupported =
    typeof window !== "undefined" && Boolean(window.speechSynthesis);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const currentLangRef = useRef(language);

  // Keep language ref updated
  useEffect(() => {
    currentLangRef.current = language;
    // If language changes while listening, stop active recognition to avoid mismatch
    if (isListeningRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
  }, [language]);

  /**
   * Stop recognition gracefully
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  /**
   * Abort recognition immediately
   */
  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  /**
   * Start speech recognition
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("not-supported");
      return;
    }

    // Prevent accidental double-starts
    if (isListeningRef.current) {
      return;
    }

    setError(null);
    setPermissionDenied(false);

    try {
      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        window.mozSpeechRecognition ||
        window.msSpeechRecognition;

      const recognition = new SpeechRecognition();
      const targetLang = SPEECH_LANG_MAP[currentLangRef.current] || "en-IN";

      recognition.lang = targetLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || "";
          if (item.isFinal) {
            currentFinal += (currentFinal ? " " : "") + text.trim();
          } else {
            currentInterim += (currentInterim ? " " : "") + text.trim();
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${currentFinal}` : currentFinal;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event) => {
        const errType = event.error;
        setError(errType);

        if (errType === "not-allowed" || errType === "permission-denied") {
          setPermissionDenied(true);
        }

        // Only reset isListening if error stops the recognition
        if (errType !== "no-speech") {
          isListeningRef.current = false;
          setIsListening(false);
          setInterimTranscript("");
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setError("start-failed");
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [isSupported]);

  /**
   * Clear working transcripts
   */
  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  /**
   * Speak accessibility instructions via Text-to-Speech
   */
  const speakInstructions = useCallback(() => {
    if (!isSynthesisSupported) return false;

    try {
      window.speechSynthesis.cancel();
      const langCode = currentLangRef.current;
      const text =
        SPOKEN_INSTRUCTIONS[langCode] || SPOKEN_INSTRUCTIONS.en;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG_MAP[langCode] || "en-IN";

      // Attempt to find matching voice
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const langPrefix = (SPEECH_LANG_MAP[langCode] || "en-IN").slice(0, 2);
        const matchingVoice = voices.find(
          (v) => v.lang === utterance.lang || v.lang.startsWith(langPrefix)
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      setIsSpeaking(false);
      return false;
    }
  }, [isSynthesisSupported]);

  /**
   * Stop spoken instructions
   */
  const stopInstructions = useCallback(() => {
    if (isSynthesisSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setIsSpeaking(false);
  }, [isSynthesisSupported]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
      isListeningRef.current = false;
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    permissionDenied,
    isSpeaking,
    isSynthesisSupported,
    currentSpeechLang: SPEECH_LANG_MAP[language] || "en-IN",
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    setTranscript,
    speakInstructions,
    stopInstructions,
  };
}

export default useSpeechRecognition;
