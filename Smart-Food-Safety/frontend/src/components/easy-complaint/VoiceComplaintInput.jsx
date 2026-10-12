import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  Check,
  Plus,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Edit3,
} from "lucide-react";
import { useTranslation, useLanguage } from "../../context/LanguageContext";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";

/**
 * FoodSafe Voice — बोलून तक्रार करा
 * Multilingual Voice Complaint Assistant component
 * Integrates directly into Step 3 of FoodSafe Easy
 */
export default function VoiceComplaintInput({
  onConfirmDescription,
  existingDescription = "",
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    permissionDenied,
    isSpeaking,
    isSynthesisSupported,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    speakInstructions,
    stopInstructions,
  } = useSpeechRecognition({ language });

  // Local editable transcript state
  const [localTranscript, setLocalTranscript] = useState("");
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const successTimeoutRef = useRef(null);

  // Sync speech recognition transcript into local editable state
  useEffect(() => {
    if (transcript) {
      setLocalTranscript(transcript);
    }
  }, [transcript]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Handle manual transcript editing
  const handleTranscriptChange = (e) => {
    setLocalTranscript(e.target.value);
  };

  // Handle retry / speak again
  const handleRetry = () => {
    resetTranscript();
    setLocalTranscript("");
    setConfirmedSuccess(false);
    startListening();
  };

  // Handle clear
  const handleClear = () => {
    resetTranscript();
    setLocalTranscript("");
    setConfirmedSuccess(false);
    abortListening();
  };

  // Handle confirm: Replace
  const handleConfirmReplace = () => {
    const textToApply = localTranscript.trim();
    if (!textToApply) return;

    if (onConfirmDescription) {
      onConfirmDescription(textToApply, "replace");
    }

    setConfirmedSuccess(true);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      setConfirmedSuccess(false);
    }, 4000);
  };

  // Handle confirm: Append to existing text
  const handleConfirmAppend = () => {
    const textToApply = localTranscript.trim();
    if (!textToApply) return;

    if (onConfirmDescription) {
      onConfirmDescription(textToApply, "append");
    }

    setConfirmedSuccess(true);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      setConfirmedSuccess(false);
    }, 4000);
  };

  const hasRecognizedText = Boolean(localTranscript.trim() || interimTranscript.trim());
  const hasExistingDescription = Boolean(existingDescription.trim());

  return (
    <div className="easy-voice-card" role="region" aria-label={t("voice.title")}>
      {/* Voice Assistant Header */}
      <div className="easy-voice-header">
        <div className="easy-voice-title-wrap">
          <div className="easy-voice-badge">
            <Sparkles size={16} />
            <span>{t("voice.badge")}</span>
          </div>
          <h2 className="easy-voice-title">{t("voice.title")}</h2>
          <p className="easy-voice-subtitle">{t("voice.subtitle")}</p>
        </div>

        {/* Spoken instructions audio guide toggle */}
        {isSynthesisSupported && (
          <button
            type="button"
            className={`easy-voice-guide-btn ${isSpeaking ? "speaking" : ""}`}
            onClick={isSpeaking ? stopInstructions : speakInstructions}
            aria-label={
              isSpeaking
                ? t("voice.instructionsStop")
                : t("voice.instructionsBtn")
            }
          >
            {isSpeaking ? (
              <>
                <VolumeX size={18} />
                <span>{t("voice.instructionsStop")}</span>
              </>
            ) : (
              <>
                <Volume2 size={18} />
                <span>{t("voice.instructionsBtn")}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Unsupported Browser Fallback */}
      {!isSupported && (
        <div className="easy-voice-alert warning" role="alert">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Browser Speech Recognition Not Supported:</strong>{" "}
            {t("voice.notSupported")}
          </div>
        </div>
      )}

      {/* Permission Denied Alert */}
      {permissionDenied && (
        <div className="easy-voice-alert error" role="alert">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>{t("voice.permissionDenied")}</div>
        </div>
      )}

      {/* No Speech Alert */}
      {error === "no-speech" && !isListening && (
        <div className="easy-voice-alert info" role="status">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>{t("voice.noSpeech")}</div>
        </div>
      )}

      {/* Main Microphone Interaction Controls */}
      <div className="easy-voice-controls">
        {!isListening ? (
          <button
            type="button"
            className="easy-voice-mic-btn idle"
            onClick={startListening}
            disabled={!isSupported}
            aria-label={t("voice.buttonStart")}
          >
            <div className="easy-voice-mic-icon-circle">
              <Mic size={28} />
            </div>
            <div className="easy-voice-mic-text">
              <span className="easy-voice-mic-primary-label">
                {t("voice.buttonStart")}
              </span>
              <span className="easy-voice-mic-sub-label">
                {language === "mr"
                  ? "मराठीत बोला (mr-IN)"
                  : language === "hi"
                  ? "हिंदी में बोलें (hi-IN)"
                  : "Speak in English (en-IN)"}
              </span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            className="easy-voice-mic-btn listening"
            onClick={stopListening}
            aria-label={t("voice.buttonStop")}
          >
            <div className="easy-voice-mic-icon-circle pulsing">
              <MicOff size={28} />
            </div>
            <div className="easy-voice-mic-text">
              <span className="easy-voice-mic-primary-label">
                {t("voice.buttonStop")}
              </span>
              <span className="easy-voice-mic-sub-label live-indicator">
                {t("voice.listening")}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Live Animated Audio Wave / Listening Indicator */}
      {isListening && (
        <div
          className="easy-voice-wave-container"
          aria-live="polite"
          aria-label="Microphone is listening"
        >
          <div className="easy-voice-wave-bar bar-1"></div>
          <div className="easy-voice-wave-bar bar-2"></div>
          <div className="easy-voice-wave-bar bar-3"></div>
          <div className="easy-voice-wave-bar bar-4"></div>
          <div className="easy-voice-wave-bar bar-5"></div>
          <span className="easy-voice-wave-text">{t("voice.listening")}</span>
        </div>
      )}

      {/* Recognized Transcript Display & Editing Box */}
      {(hasRecognizedText || isListening) && (
        <div className="easy-voice-transcript-section animate-fade-in">
          <div className="easy-voice-transcript-header">
            <label
              htmlFor="voice-transcript-editor"
              className="easy-voice-transcript-label"
            >
              <Edit3 size={15} />
              <span>{t("voice.transcriptLabel")}</span>
            </label>
            <span className="easy-voice-transcript-hint">
              Tap below to fix any words
            </span>
          </div>

          <textarea
            id="voice-transcript-editor"
            className="easy-voice-transcript-area"
            rows={3}
            placeholder={t("voice.transcriptPlaceholder")}
            value={localTranscript}
            onChange={handleTranscriptChange}
          />

          {/* Interim speech recognition display */}
          {interimTranscript && (
            <div className="easy-voice-interim-box" aria-live="polite">
              <span className="easy-voice-interim-dot"></span>
              <em>{interimTranscript}</em>
            </div>
          )}

          {/* Transcript Action Buttons */}
          <div className="easy-voice-actions-row">
            {/* If main description already has text, offer Add vs Replace */}
            {hasExistingDescription ? (
              <>
                <button
                  type="button"
                  className="easy-voice-action-btn primary"
                  onClick={handleConfirmAppend}
                  disabled={!localTranscript.trim()}
                  aria-label={t("voice.confirmAppend")}
                >
                  <Plus size={16} />
                  <span>{t("voice.confirmAppend")}</span>
                </button>
                <button
                  type="button"
                  className="easy-voice-action-btn secondary"
                  onClick={handleConfirmReplace}
                  disabled={!localTranscript.trim()}
                  aria-label={t("voice.confirmReplace")}
                >
                  <Check size={16} />
                  <span>{t("voice.confirmReplace")}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="easy-voice-action-btn primary"
                onClick={handleConfirmReplace}
                disabled={!localTranscript.trim()}
                aria-label={t("voice.confirmAction")}
              >
                <Check size={16} />
                <span>{t("voice.confirmAction")}</span>
              </button>
            )}

            <button
              type="button"
              className="easy-voice-action-btn outline"
              onClick={handleRetry}
              aria-label={t("voice.retryAction")}
            >
              <RotateCcw size={16} />
              <span>{t("voice.retryAction")}</span>
            </button>

            <button
              type="button"
              className="easy-voice-action-btn ghost"
              onClick={handleClear}
              aria-label={t("voice.clearAction")}
            >
              <Trash2 size={16} />
              <span>{t("voice.clearAction")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation feedback toast notice */}
      {confirmedSuccess && (
        <div
          className="easy-voice-toast animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <Check size={18} />
          <span>{t("voice.confirmedNotice")}</span>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="easy-voice-privacy">
        <ShieldCheck size={16} className="easy-voice-privacy-icon" />
        <span>{t("voice.privacyNotice")}</span>
      </div>
    </div>
  );
}
