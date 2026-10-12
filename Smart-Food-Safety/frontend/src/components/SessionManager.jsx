import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getToken,
  getCurrentUser,
  logout,
} from "../services/authService";

function SessionManager() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = getToken();

      // No login session
      if (!token) {
        return;
      }

      try {
        await getCurrentUser();
      } catch {
        console.log("Session expired or invalid.");

        logout();

        if (isMounted) {
          navigate("/login", {
            replace: true,
            state: {
              message:
                "Your session has expired. Please login again.",
            },
          });
        }
      }
    };

    // Check immediately
    verifySession();

    // Check every 5 minutes
    const interval = setInterval(() => {
      verifySession();
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [navigate]);

  return null;
}

export default SessionManager;