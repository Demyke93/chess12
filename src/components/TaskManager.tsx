
import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from 'lucide-react';

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState<string>('');

  const addTask = () => {
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: Date.now(),
        text: newTaskText,
        completed: false
      };
      setTasks([...tasks, newTask]);
      setNewTaskText('');
    }
  };

  const toggleTaskCompletion = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input 
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Enter a new task"
          className="flex-grow"
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <Button onClick={addTask} variant="default">
          Add Task
        </Button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`flex items-center space-x-2 p-2 rounded transition-colors ${
              task.completed 
                ? 'bg-green-50 opacity-70' 
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleTaskCompletion(task.id)}
            />
            <span 
              className={`flex-grow ${
                task.completed 
                  ? 'line-through text-gray-500' 
                  : 'text-gray-800'
              }`}
            >
              {task.text}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => deleteTask(task.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <p className="text-center text-gray-500 italic">
          No tasks yet. Add a task to get started!
        </p>
      )}

      {tasks.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          <span className="mr-2">
            Total Tasks: {tasks.length}
          </span>
          <span>
            Completed: {tasks.filter(t => t.completed).length}
          </span>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
