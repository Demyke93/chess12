
import { useState } from "react";
import { TodoItem } from "./TodoItem";
import { Plus } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    setTodos(prev => [{
      id: crypto.randomUUID(),
      text: newTodo.trim(),
      completed: false
    }, ...prev]);
    setNewTodo("");
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">My Tasks</h1>
      
      <form onSubmit={addTodo} className="flex gap-2">
        <Input
          type="text"
          placeholder="Add a new task..."
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" className="bg-purple-500 hover:bg-purple-600">
          <Plus size={20} />
        </Button>
      </form>

      <div className="space-y-3">
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            {...todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
        
        {todos.length === 0 && (
          <p className="text-center text-slate-500 py-6">
            No tasks yet. Add one above!
          </p>
        )}
      </div>
    </div>
  );
}
