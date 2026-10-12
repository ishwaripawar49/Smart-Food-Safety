import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  getToken,
  getCurrentUser,
  logout,
} from "../services/authService";
import ErrorBoundary from "./ErrorBoundary";


function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authorized, setAuthorized] = useState(false);


  /* =========================================================
     SESSION CHECK
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const token = getToken();

        /* =====================================================
           NO TOKEN
        ===================================================== */

        if (!token) {
          if (mounted) {
            setAuthenticated(false);
            setAuthorized(false);
            setChecking(false);
          }

          return;
        }


        /* =====================================================
           VERIFY TOKEN WITH BACKEND
        ===================================================== */

        const user = await getCurrentUser();


        if (!mounted) {
          return;
        }


        /* =====================================================
           INVALID USER
        ===================================================== */

        if (!user) {
          logout();

          setAuthenticated(false);
          setAuthorized(false);
          setChecking(false);

          return;
        }


        /* =====================================================
           AUTHENTICATED
        ===================================================== */

        setAuthenticated(true);


        /* =====================================================
           ROLE CHECK
        ===================================================== */

        if (allowedRoles.length === 0) {
          setAuthorized(true);
        }

        else if (
          allowedRoles.includes(user.role)
        ) {
          setAuthorized(true);
        }

        else {
          setAuthorized(false);
        }


        setChecking(false);

      } catch (error) {

        console.error(
          "PROTECTED ROUTE SESSION ERROR:",
          error
        );


        /* =====================================================
           SESSION INVALID / EXPIRED
        ===================================================== */

        logout();


        if (mounted) {
          setAuthenticated(false);
          setAuthorized(false);
          setChecking(false);
        }

      }
    };


    checkSession();


    /* =========================================================
       CLEANUP
    ========================================================= */

    return () => {
      mounted = false;
    };

  }, [allowedRoles]);


  /* ===========================================================
     CHECKING SESSION
  =========================================================== */

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
          fontFamily: "Arial, sans-serif",
        }}
      >

        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            minWidth: "280px",
          }}
        >

          <div
            style={{
              fontSize: "34px",
              marginBottom: "12px",
            }}
          >
            🔐
          </div>


          <h3
            style={{
              margin: "0 0 8px",
              color: "#17211B",
            }}
          >
            Checking Session
          </h3>


          <p
            style={{
              margin: 0,
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            Verifying your login...
          </p>

        </div>

      </div>
    );
  }


  /* ===========================================================
     NOT AUTHENTICATED
  =========================================================== */

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message:
            "Please login to access this page.",
        }}
      />
    );
  }


  /* ===========================================================
     AUTHENTICATED BUT WRONG ROLE
  =========================================================== */

  if (!authorized) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }


  /* ===========================================================
     AUTHENTICATED + AUTHORIZED
  =========================================================== */

  return <ErrorBoundary>{children}</ErrorBoundary>;
}


export default ProtectedRoute;