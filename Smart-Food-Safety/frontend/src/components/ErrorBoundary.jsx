import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "48px 24px",
            maxWidth: "600px",
            margin: "40px auto",
            background: "var(--color-surface, #ffffff)",
            borderRadius: "12px",
            border: "1px solid var(--color-border, #e5e7eb)",
            textAlign: "center",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "var(--color-heading, #111827)" }}>
            Something went wrong
          </h2>
          <p style={{ color: "var(--color-secondary, #6b7280)", fontSize: "14px", marginBottom: "20px" }}>
            An unexpected error occurred while rendering this component.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: "#f3f4f6",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#b91c1c",
                textAlign: "left",
                overflowX: "auto",
                marginBottom: "24px",
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={this.handleReset}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <RefreshCw size={14} />
              <span>Try Again</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => (window.location.href = "/authority-dashboard")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Home size={14} />
              <span>Authority Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
