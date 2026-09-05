import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, User, CircleCheck, TriangleAlert, Send, ChevronUp, ChevronDown } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Mascot } from "@/components/Mascot";
import { TaskStatusForm } from "../TaskStatusForm";
import { updateTaskStatus, assignTask, moveTask } from "../actions";
import { sendManualReminder } from "../../notifications/actions";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/urgency";
import { getEventTemplateDotColor } from "@/lib/eventTemplateStyle";
import { ArchiveEventButton } from "./ArchiveEventButton";
import { AddCustomTaskForm } from "./AddCustomTaskForm";
import { CustomTaskActions } from "./CustomTaskActions";

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
  const isFullyCompleted = employeeEvent.tasks.length > 0 && doneCount === employeeEvent.tasks.length;

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

      {isFullyCompleted && (
        <Card className="mt-4 flex flex-col items-center gap-3 border-accent-teal/25 bg-accent-teal/5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <CircleCheck size={16} className="text-accent-teal" />
              Parcours terminé
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Toutes les étapes de ce parcours ont été complétées.
            </p>
          </div>
          <Mascot pose="completedJourney" className="h-24 w-auto shrink-0" />
        </Card>
      )}

      <div className="mt-6">
        <AddCustomTaskForm employeeEventId={employeeEvent.id} members={members} />
      </div>

      <div className="mt-4">
        <Card className="flex flex-col">
          {employeeEvent.tasks.map((task: (typeof employeeEvent.tasks)[number], index: number) => {
            const overdue = isOverdue(task.dueDate, task.status);
            const isLast = index === employeeEvent.tasks.length - 1;
            return (
              <div
                key={task.id}
                id={`task-${task.id}`}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                {!isLast && (
                  <span className="absolute left-[9px] top-6 h-full w-px bg-surface-border" />
                )}
                <span
                  className={`relative mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                    task.status === "DONE"
                      ? "border-accent-teal text-accent-teal"
                      : overdue
                        ? "border-accent-rose text-accent-rose"
                        : "border-surface-border text-ink-faint"
                  }`}
                >
                  {task.status === "DONE" ? (
                    <CircleCheck size={13} />
                  ) : overdue ? (
                    <TriangleAlert size={11} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                        Étape {task.stepOrder}
                      </p>
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
                                  className="ml-1.5 inline-flex items-center gap-1 text-brand-primary hover:underline"
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
                                className="text-brand-primary hover:underline"
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
                      {task.taskTemplateId === null && (
                        <p className="mt-0.5 text-[11px] font-medium text-brand-primary">
                          Étape ajoutée manuellement
                        </p>
                      )}
                      <CustomTaskActions
                        task={{
                          id: task.id,
                          label: task.label,
                          dueDate: task.dueDate.toISOString().slice(0, 10),
                          assignedMembershipId: task.assignedMembershipId,
                          taskTemplateId: task.taskTemplateId,
                        }}
                        members={members}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex flex-col overflow-hidden rounded-lg border border-surface-border">
                        <form action={moveTask.bind(null, task.id, "up")}>
                          <button
                            type="submit"
                            disabled={task.stepOrder === employeeEvent.tasks[0]?.stepOrder}
                            aria-label="Monter cette tâche"
                            title="Monter cette tâche"
                            className="flex h-7 w-7 items-center justify-center text-ink-soft hover:bg-surface-subtle hover:text-brand-primary disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronUp size={16} />
                          </button>
                        </form>
                        <div className="h-px bg-surface-border" />
                        <form action={moveTask.bind(null, task.id, "down")}>
                          <button
                            type="submit"
                            disabled={
                              task.stepOrder === employeeEvent.tasks[employeeEvent.tasks.length - 1]?.stepOrder
                            }
                            aria-label="Descendre cette tâche"
                            title="Descendre cette tâche"
                            className="flex h-7 w-7 items-center justify-center text-ink-soft hover:bg-surface-subtle hover:text-brand-primary disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </form>
                      </div>
                      <TaskStatusForm
                        action={updateTaskStatus.bind(null, task.id)}
                        currentStatus={task.status}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
