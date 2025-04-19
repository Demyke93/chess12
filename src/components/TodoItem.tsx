
import { cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ id, text, completed, onToggle, onDelete }: TodoItemProps) {
  return (
    <div 
      className={cn(
        "group flex items-center gap-3 p-4 rounded-lg transition-all duration-200",
        "bg-white/50 hover:bg-white/80 shadow-sm hover:shadow",
        "animate-in fade-in-50 slide-in-from-top-5"
      )}
    >
      <button
        onClick={() => onToggle(id)}
        className={cn(
          "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
          completed ? "bg-purple-500 border-purple-500" : "border-gray-300 hover:border-purple-500"
        )}
      >
        {completed && <Check size={14} className="text-white" />}
      </button>
      <span className={cn(
        "flex-1 text-slate-600 transition-all",
        completed && "line-through text-slate-400"
      )}>
        {text}
      </span>
      <button
        onClick={() => onDelete(id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
