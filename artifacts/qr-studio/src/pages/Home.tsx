import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useListDesigns, useDeleteDesign, getListDesignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { QrCode, Plus, Pencil, Trash2, LogOut } from "lucide-react";

interface HomeProps {
  onNewDesign: () => void;
  onOpenDesign: (design: any) => void;
}

export default function Home({ onNewDesign, onOpenDesign }: HomeProps) {
  const { user, logout } = useAuth();
  const { data: designs, isLoading } = useListDesigns();
  const deleteDesign = useDeleteDesign();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteDesign.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListDesignsQueryKey() });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">QR Studio</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {user.profileImageUrl && (
                <img src={user.profileImageUrl} alt="Avatar" className="w-7 h-7 rounded-full ring-2 ring-border" />
              )}
              <span>{user.firstName || user.email}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Hero new design button */}
        <button
          onClick={onNewDesign}
          className="w-full mb-10 h-28 rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Новый дизайн
          </span>
        </button>

        {/* Designs section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Мои дизайны
          </h2>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {!isLoading && (!designs || designs.length === 0) && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Пока нет дизайнов</p>
              <p className="text-xs">Создайте первый дизайн, нажав кнопку выше</p>
            </div>
          )}

          {designs && designs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {designs.map((d) => (
                <div
                  key={d.id}
                  className="group relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all"
                  onClick={() => onOpenDesign(d)}
                >
                  <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden">
                    {d.thumbnail ? (
                      <img src={d.thumbnail} alt={d.title} className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-card shadow-md flex items-center justify-center text-primary">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <button
                      className="w-8 h-8 rounded-lg bg-card shadow-md flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                      onClick={(e) => handleDelete(e, d.id)}
                      disabled={deletingId === d.id}
                    >
                      {deletingId === d.id ? (
                        <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="p-3 border-t border-border">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(d.updatedAt).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
