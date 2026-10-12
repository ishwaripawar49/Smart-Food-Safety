import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, LogIn } from "lucide-react";
import { logout } from "../services/authService";

function Unauthorized() {
  const navigate = useNavigate();

  const handleSwitchAccount = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        fontFamily: "var(--font-family)",
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: "var(--space-8)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-error-bg)",
            color: "var(--color-error)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto var(--space-4)",
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "800",
            color: "var(--color-heading)",
            margin: "0 0 8px",
          }}
        >
          Access Restricted
        </h1>

        <p
          style={{
            color: "var(--color-secondary)",
            fontSize: "var(--font-size-sm)",
            lineHeight: "1.6",
            margin: "0 0 24px",
          }}
        >
          You do not have the statutory role privileges required to view this secured administrative or regulatory portal area.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => navigate("/")}
          >
            <Home size={16} />
            <span>Return to Public Website</span>
          </button>

          <button
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleSwitchAccount}
          >
            <LogIn size={16} />
            <span>Sign In with Different Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;