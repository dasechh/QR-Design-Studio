import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md w-full backdrop-blur-sm bg-card/50 border border-border rounded-2xl shadow-2xl">
        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <QrCode className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">QR Studio</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Профессиональный редактор для создания дизайнов с QR-кодами. Создавайте, настраивайте и сохраняйте красивые композиции.
        </p>

        <Button
          size="lg"
          className="w-full font-semibold text-primary-foreground hover:bg-primary/90"
          onClick={login}
          data-testid="button-login"
        >
          Войти и начать создавать
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Используется аккаунт Replit
        </p>
      </div>
    </div>
  );
}
