import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthModal } from "@/context/AuthModalContext";

// Target for old /login and /register links: opens the shared login modal
// and sends the user back to the homepage instead of rendering a bare page.
const OpenLoginModalRedirect = () => {
  const { openLoginModal } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    openLoginModal();
    navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default OpenLoginModalRedirect;
