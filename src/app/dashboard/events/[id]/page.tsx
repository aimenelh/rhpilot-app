import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, User, CircleCheck, CircleDashed, TriangleAlert, Send, ChevronUp, ChevronDown } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TaskStatusForm } from "../TaskStatusForm";
import { updateTaskStatus, assignTask, moveTask } from "../actions";
import { sendManualReminder } from "../../notifications/actions";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/urgency";
import { getEventTemplateDotColor } from "@/lib/eventTemplateStyle";
import { ArchiveEventButton } from "./ArchiveEventButton";
import { AddCustomTaskForm } from "./AddCustomTaskForm";

export const dynamic = "force-dynamic";

const RESOLUTION_ROLE_LABELS: Record<string, string> = {
  RH: "RH",
  DIRIGEANT: "Dirigeant",
  MANAGER_DIRECT: "Manager direct",
};

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const [employeeEvent, members] = await Promise.all([
    prisma.employeeEvent.findFirst({
      where: { id: params.id, organizationId: membership.organizationId, deletedAt: null },
      include: {
        employee: true,
        eventTemplate: true,
        tasks: {
          orderBy: { stepOrder: "asc" },
          include: { assignedMembership: { include: { user: true } } },
        },
      },
    }),
    prisma.membership.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!employeeEvent) notFound();

  const doneCount = employeeEvent.tasks.filter((task) => task.status === "DONE").length;

  return (
    <div className="max-w-3xl">
      <Link
        href={`/dashboard/employees/${employeeEvent.employeeId}`}
        className="text-sm text-ink-soft hover:text-ink"
      >
        ← Retour à {employeeEvent.employee.firstName} {employeeEvent.employee.lastName}
      </Link>

      <div className="mt-3 flex items-center gap-2.5">
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${getEventTemplateDotColor(employeeEvent.eventTemplate.key)}`}
        />
        <h1 className="text-2xl font-semibold text-ink">{employeeEvent.eventTemplate.label}</h1>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {employeeEvent.employee.firstName} {employeeEvent.employee.lastName} · Déclenché
        le {formatDate(employeeEvent.triggerDate)}
      </p>
      <div className="mt-3 max-w-xs">
        <ProgressBar value={doneCount} max={employeeEvent.tasks.length} />
      </div>

      <div className="mt-3">
        <ArchiveEventButton eventId={employeeEvent.id} />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {employeeEvent.tasks.map((task) => {
          const overdue = isOverdue(task.dueDate, task.status);
          return (
            <Card key={task.id} id={`task-${task.id}`} compact>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    {task.status === "DONE" ? (
                      <CircleCheck size={15} className="text-accent-teal" />
                    ) : overdue ? (
                      <TriangleAlert size={15} className="text-accent-rose" />
                    ) : (
                      <CircleDashed size={15} className="text-ink-faint" />
                    )}
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                      Étape {task.stepOrder}
                    </p>
                  </div>
                  <h3 className="mt-0.5 text-sm font-semibold text-ink">{task.label}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                    <CalendarDays size={12} />
                    {formatDate(task.dueDate)}
                    {overdue && <span className="font-medium text-accent-rose">(en retard)</span>}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                    <User size={12} />
                    {task.assignedMembership ? (
                      <>
                        {getUserDisplayName(task.assignedMembership.user)}
                        {task.status !== "DONE" && task.status !== "CANCELLED" && (
                          <form action={sendManualReminder.bind(null, task.id)}>
                            <button
                              type="submit"
                              className="ml-1.5 inline-flex items-center gap-1 text-brand-blue hover:underline"
                            >
                              <Send size={11} />
                              Relancer
                            </button>
                          </form>
                        )}
                      </>
                    ) : (
                      <span className="flex flex-1 items-center gap-2">
                        <span className="text-ink-faint">{RESOLUTION_ROLE_LABELS[task.resolutionRole]}</span>
                        <Badge tone="neutral">À assigner</Badge>
                        <form
                          action={assignTask.bind(null, task.id)}
                          className="flex items-center gap-1.5"
                        >
                          <Select
                            name="assignedMembershipId"
                            defaultValue=""
                            className="!w-auto py-1 text-xs"
                          >
                            <option value="" disabled>
                              Assigner à...
                            </option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {getUserDisplayName(m.user)}
                              </option>
                            ))}
                          </Select>
                          <button
                            type="submit"
                            className="text-brand-blue hover:underline"
                          >
                            OK
                          </button>
                        </form>
                      </span>
                    )}
                  </p>
                  {task.proofRequired && task.proofLabel && (
                    <p className="mt-0.5 text-xs text-accent-amber">
                      Pièce attendue : {task.proofLabel}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex flex-col">
                    <form action={moveTask.bind(null, task.id, "up")}>
                      <button
                        type="submit"
                        disabled={task.stepOrder === employeeEvent.tasks[0]?.stepOrder}
                        aria-label="Monter cette tâche"
                        className="flex h-5 w-5 items-center justify-center text-ink-faint hover:text-ink disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                    </form>
                    <form action={moveTask.bind(null, task.id, "down")}>
                      <button
                        type="submit"
                        disabled={
                          task.stepOrder === employeeEvent.tasks[employeeEvent.tasks.length - 1]?.stepOrder
                        }
                        aria-label="Descendre cette tâche"
                        className="flex h-5 w-5 items-center justify-center text-ink-faint hover:text-ink disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </form>
                  </div>
                  <TaskStatusForm
                    action={updateTaskStatus.bind(null, task.id)}
                    currentStatus={task.status}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-4">
        <AddCustomTaskForm employeeEventId={employeeEvent.id} members={members} />
      </div>
    </div>
  );
}
