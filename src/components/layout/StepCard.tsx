/** A numbered step of the workflow: badge, title, description and optional action. */
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  step: number;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export function StepCard({ step, title, description, action, children, contentClassName }: Props) {
  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {step}
          </span>
          {title}
        </CardTitle>
        {description && <CardDescription className="pl-10">{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
