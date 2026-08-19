import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";

// Site-wide nudge shown just below the header for signed-out visitors —
// several features (Quick Read, downloads, favorites) are login-only, so
// this surfaces that up front rather than only when they hit a gate.
const LoggedOutBanner = () => {
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  if (isAuthenticated) return null;

  return (
    <div className="w-full bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
      You're not logged in.{" "}
      <button type="button" onClick={openLoginModal} className="underline underline-offset-2 hover:no-underline">
        Log in
      </button>{" "}
      to unlock favorites, downloads, Quick Read, and more.
    </div>
  );
};

export default LoggedOutBanner;
