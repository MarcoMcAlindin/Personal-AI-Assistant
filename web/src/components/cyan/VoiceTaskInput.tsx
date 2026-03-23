// web/src/components/cyan/VoiceTaskInput.tsx
import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { taskService } from '../../services/taskService';
import { TaskFormFields } from '../../types/tasks';

interface VoiceTaskInputProps {
  onExtracted: (fields: Partial<Omit<TaskFormFields, 'date'>>) => void;
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export default function VoiceTaskInput({ onExtracted }: VoiceTaskInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const latestTranscriptRef = useRef<string>('');

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser.');
      setState('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      latestTranscriptRef.current = full;
      setTranscript(full);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setErrorMsg('Microphone access denied');
      } else {
        setErrorMsg('Recording error — please try again.');
      }
      setState('error');
    };

    recognition.start();
    setState('recording');
    setTranscript('');
    setErrorMsg('');
  };

  const stopRecording = async () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const captured = latestTranscriptRef.current;
    latestTranscriptRef.current = '';

    if (!captured.trim()) {
      setErrorMsg('Nothing captured, try again');
      setState('error');
      return;
    }

    setState('processing');
    try {
      const fields = await taskService.parseVoiceTranscript(captured);

      if (!fields.title) {
        setErrorMsg("Couldn't parse your task — please fill in manually");
        setState('error');
        return;
      }

      onExtracted({
        title: fields.title ?? undefined,
        description: fields.description ?? undefined,
        urgency: fields.urgency ?? 'medium',
        time: fields.time ?? undefined,
      });
      setState('done');
      setTranscript('');
    } catch (err: any) {
      let msg: string;
      if (err?.message === 'warming') {
        msg = 'AI is warming up, try again in 30s';
      } else if (err instanceof SyntaxError || err?.name === 'SyntaxError') {
        msg = "Couldn't parse your task — please fill in manually";
      } else {
        msg = "Couldn't parse your task — please fill in manually";
      }
      setErrorMsg(msg);
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setErrorMsg('');
    setTranscript('');
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '12px',
            background: isRecording
              ? 'rgba(255,68,68,0.15)'
              : 'linear-gradient(135deg, #0099CC, #00FFFF)',
            color: isRecording ? '#FF4444' : '#000',
            border: isRecording ? '1px solid rgba(255,68,68,0.4)' : 'none',
          }}
        >
          {isProcessing ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : isRecording ? (
            <MicOff size={14} />
          ) : (
            <Mic size={14} />
          )}
          {isProcessing ? 'Processing...' : isRecording ? 'Stop' : '🎤 Voice'}
        </button>

        {state === 'done' && (
          <span style={{ fontSize: '12px', color: '#00FFFF' }}>✓ Fields filled</span>
        )}
        {state === 'error' && (
          <button
            onClick={reset}
            style={{ fontSize: '11px', color: '#BBC9CD', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Retry
          </button>
        )}
      </div>

      {isRecording && transcript && (
        <div style={{
          fontSize: '11px',
          color: '#BBC9CD',
          background: '#0D0D0D',
          border: '1px solid #2A2A2A',
          borderRadius: '6px',
          padding: '6px 10px',
          fontStyle: 'italic',
        }}>
          "{transcript}"
        </div>
      )}

      {state === 'error' && errorMsg && (
        <div style={{ fontSize: '11px', color: '#FF4444' }}>{errorMsg}</div>
      )}
    </div>
  );
}
