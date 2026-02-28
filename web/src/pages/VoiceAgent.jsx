import React, { useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  BarVisualizer,
  useVoiceAssistant,
} from "@livekit/components-react";
import "@livekit/components-styles"; // Import main bundle containing all styles including participant
import { voiceApi } from "../services/api";
import { Brain, Mic } from "lucide-react";

function AgentUI() {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "2rem",
          gap: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "rgba(0,0,0,0.2)",
            border: "1px solid var(--color-border)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {state === "disconnected" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                color: "var(--color-text-muted)",
              }}
            >
              <Mic size={24} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: "0.9rem" }}>Agent is offline</span>
            </div>
          ) : (
            <BarVisualizer
              state={state}
              trackRef={audioTrack}
              barCount={7}
              options={{ minHeight: 20 }}
              style={{ width: "80%", height: "80px" }}
            />
          )}
        </div>

        {/* Transcript Area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "rgba(0,0,0,0.1)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              fontWeight: 600,
            }}
          >
            Live Transcript
          </h3>
          {agentTranscriptions && agentTranscriptions.length > 0 ? (
            agentTranscriptions.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 14px",
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.95rem",
                  color: "var(--color-text-primary)",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--color-accent-primary)",
                    marginRight: "8px",
                  }}
                >
                  Agent:
                </span>
                {t.text}
              </div>
            ))
          ) : (
            <div
              style={{
                color: "var(--color-text-muted)",
                fontStyle: "italic",
                fontSize: "0.9rem",
                textAlign: "center",
                marginTop: "2rem",
              }}
            >
              Waiting for the agent to say something...
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "2rem",
          display: "flex",
          justifyContent: "center",
          backgroundColor: "var(--color-bg-secondary)",
          borderTop: "1px solid var(--color-border)",
          borderTopLeftRadius: "2rem",
          borderTopRightRadius: "2rem",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <VoiceAssistantControlBar />
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

export default function VoiceAgent() {
  const [token, setToken] = useState(null);
  const [url, setUrl] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const connectToAgent = async () => {
    setIsConnecting(true);
    setError("");
    try {
      const res = await voiceApi.getLiveKitToken();
      setUrl(res.data.url);
      setToken(res.data.token);
      setIsConnected(true);
    } catch (err) {
      console.error("Failed to get token:", err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to connect to agent",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectAgent = () => {
    setIsConnected(false);
    setToken(null);
    setUrl(null);
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <div
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-secondary)",
          zIndex: 10,
        }}
      >
        <h1
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          <Mic className="text-accent" /> Voice Assistant
        </h1>
        <p
          style={{
            margin: 0,
            marginTop: "4px",
            color: "var(--color-text-muted)",
          }}
        >
          Talk directly to your SMS assistant in real-time.
        </p>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {!isConnected ? (
          <div
            className="card"
            style={{
              maxWidth: 400,
              width: "90%",
              textAlign: "center",
              padding: "3rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Brain
                size={40}
                style={{ color: "var(--color-accent-primary)" }}
              />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                Start Voice Session
              </h2>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                }}
              >
                The voice assistant can help you find items, manage your
                wardrobe, and create trips instantly using your microphone.
              </p>
            </div>

            {error && (
              <div
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "var(--color-error)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={connectToAgent}
              disabled={isConnecting}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                display: "flex",
                justifyContent: "center",
                opacity: isConnecting ? 0.7 : 1,
              }}
            >
              {isConnecting ? "Connecting..." : "Connect to Agent"}
            </button>
          </div>
        ) : (
          <div style={{ height: "100%", width: "100%" }}>
            <LiveKitRoom
              serverUrl={url}
              token={token}
              connect={true}
              audio={true}
              video={false}
              onDisconnected={disconnectAgent}
              className="livekit-custom-container"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <AgentUI />
            </LiveKitRoom>
          </div>
        )}
      </div>

      <style>{`
                /* Override LiveKit's default dark mode colors to match our theme */
                .lk-control-bar {
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .lk-button {
                    background-color: var(--color-bg-primary) !important;
                    color: var(--color-text-primary) !important;
                    border: 1px solid var(--color-border) !important;
                    border-radius: var(--radius-full) !important;
                    transition: all 0.2s ease !important;
                }
                .lk-button:hover {
                    background-color: var(--color-bg-tertiary) !important;
                    border-color: var(--color-accent-primary) !important;
                }
                .lk-button.lk-button-danger {
                    background-color: rgba(239, 68, 68, 0.1) !important;
                    color: var(--color-error) !important;
                    border-color: transparent !important;
                }
                .lk-button.lk-button-danger:hover {
                    background-color: rgba(239, 68, 68, 0.2) !important;
                }
                .lk-bar-visualizer {
                    /* Allow the visualizer to take the color */
                    opacity: 0.8;
                }
                .lk-bar-visualizer > div {
                    background-color: var(--color-accent-primary) !important;
                    border-radius: 4px;
                }
            `}</style>
    </div>
  );
}
