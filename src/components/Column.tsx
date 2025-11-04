import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Task, Column as ColumnType } from '../types';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onEditEvent?: (task: Task) => void;
}

export const Column: React.FC<ColumnProps> = ({ column, tasks, onDeleteTask, onEditEvent }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="column">
      <h3 className="column-title">{column.title}</h3>
      <div
        ref={setNodeRef}
        className={`task-list ${isOver ? 'drag-over' : ''}`}
      >
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
              onEditEvent={onEditEvent}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="empty-column">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
};