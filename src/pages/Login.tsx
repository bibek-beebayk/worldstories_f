import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log In</CardTitle>
          <CardDescription>Continue with your Google account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <GoogleLoginButton onSuccess={() => navigate("/")} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
