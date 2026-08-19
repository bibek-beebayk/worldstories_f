import { Link, LinkProps } from "react-router-dom";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";

// Drop-in replacement for react-router's <Link>, for features (like Quick
// Read) that should present the same affordance to every visitor but only
// actually navigate for logged-in ones — everyone else gets the login modal
// instead of a click-through to a page that will just gate them anyway.
// Renders a <button> (not an <a>) when logged out so it stays safe to use
// around plain content; don't wrap another interactive element (a <Button>)
// with this — give that element its own onClick instead.
const AuthGatedLink = ({ className, children, ...props }: LinkProps) => {
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  if (!isAuthenticated) {
    return (
      <button type="button" className={className} onClick={openLoginModal}>
        {children}
      </button>
    );
  }

  return (
    <Link className={className} {...props}>
      {children}
    </Link>
  );
};

export default AuthGatedLink;
