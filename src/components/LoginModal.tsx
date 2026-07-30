import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import BookWorldArt from "@/components/BookWorldArt";
import { useAuthModal } from "@/context/AuthModalContext";

const LoginModal = () => {
  const { isLoginModalOpen, closeLoginModal } = useAuthModal();

  if (!isLoginModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={closeLoginModal}
    >
      <Card
        className="mx-auto w-full max-w-md overflow-hidden border shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-login-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-hero-gradient-start via-hero-dark to-hero-gradient-end px-6 pb-7 pt-6">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <BookWorldArt className="pointer-events-none absolute -right-4 top-9 h-28 w-36" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <span className="text-lg font-bold text-primary-foreground">W</span>
              </div>
              <span className="text-sm font-semibold text-white">WorldStories</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={closeLoginModal}
              aria-label="Close login modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <h2 id="google-login-title" className="relative mt-6 max-w-[70%] text-xl font-bold text-white">
            Welcome back, storyteller
          </h2>
          <p className="relative mt-1 max-w-[70%] text-sm text-white/70">
            Sign in to save favorites, track your reading progress, and pick up right where you left off.
          </p>
        </div>

        <CardContent className="pb-6 pt-6">
          <div className="flex justify-center">
            <GoogleLoginButton onSuccess={closeLoginModal} />
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing, you agree to WorldStories'{" "}
            <Link to="/terms" className="font-medium text-primary hover:underline" onClick={closeLoginModal}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-primary hover:underline" onClick={closeLoginModal}>
              Privacy Policy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginModal;
