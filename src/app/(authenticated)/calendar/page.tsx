"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Id } from "../../../../convex/_generated/dataModel";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const priorityDots = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-gray-400",
};

const statusColors = {
  todo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function CalendarPage() {
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);
  const updateTask = useMutation(api.tasks.update);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getTasksForDay = (day: number) => {
    if (!tasks) return [];
    const date = new Date(currentYear, currentMonth, day);
    return tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));
  };

  const getProjectName = (pid?: Id<"projects">) => {
    if (!pid || !projects) return null;
    return projects.find((p) => p._id === pid)?.name ?? null;
  };

  const selectedTasks = selectedDate
    ? tasks?.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate)) ?? []
    : [];

  const cycleStatus = async (id: Id<"tasks">, current: string) => {
    const next = current === "todo" ? "in_progress" : current === "in_progress" ? "done" : "todo";
    await updateTask({ id, status: next as "todo" | "in_progress" | "done" });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <Button variant="outline" onClick={goToToday}>
          Today
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <div className="mb-4 flex items-center justify-between">
                <Button variant="ghost" onClick={prevMonth}>
                  ←
                </Button>
                <h2 className="text-lg font-semibold">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <Button variant="ghost" onClick={nextMonth}>
                  →
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-px">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}

                {calendarDays.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="min-h-[80px]" />;
                  }

                  const dayTasks = getTasksForDay(day);
                  const date = new Date(currentYear, currentMonth, day);
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const hasTasks = dayTasks.length > 0;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`min-h-[80px] cursor-pointer rounded-md border p-1 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : isToday
                            ? "border-primary/50 bg-primary/5"
                            : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            isToday
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-foreground"
                          }`}
                        >
                          {day}
                        </span>
                        {hasTasks && (
                          <span className="text-xs text-muted-foreground">{dayTasks.length}</span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task._id}
                            className="flex items-center gap-1 truncate"
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${priorityDots[task.priority]}`}
                            />
                            <span
                              className={`truncate text-[10px] ${
                                task.status === "done"
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayTasks.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">
            {selectedDate
              ? selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : "Select a date"}
          </h2>
          <Card>
            <CardContent className="pt-4">
              {!selectedDate ? (
                <div className="py-6 text-center">
                  <p className="mb-1 text-2xl">📅</p>
                  <p className="text-sm text-muted-foreground">
                    Click a date to see its tasks
                  </p>
                </div>
              ) : selectedTasks.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="mb-1 text-2xl">✨</p>
                  <p className="text-sm text-muted-foreground">
                    No tasks due on this date
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTasks.map((task) => {
                    const projectName = getProjectName(task.projectId);
                    return (
                      <div
                        key={task._id}
                        className="flex items-start justify-between border-b pb-3 last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => cycleStatus(task._id, task.status)}
                            className="mt-0.5 text-base transition-transform hover:scale-110"
                          >
                            {task.status === "done"
                              ? "✅"
                              : task.status === "in_progress"
                                ? "🔄"
                                : "⬜"}
                          </button>
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                task.status === "done"
                                  ? "text-muted-foreground line-through"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            {projectName && (
                              <span className="text-xs text-muted-foreground">
                                📁 {projectName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${statusColors[task.status]}`}
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${priorityDots[task.priority]}`}
                            title={task.priority}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
