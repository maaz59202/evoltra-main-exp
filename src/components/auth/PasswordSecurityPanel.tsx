import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, Check,  ShieldAlert, ShieldCheck } from '@/components/ui/icons';

import { cn } from '@/lib/utils';

type PasswordRequirement = {
  text: string;
  met: boolean;
};

interface PasswordSecurityPanelProps {
  password: string;
  requirements: PasswordRequirement[];
  strengthLabel: 'Weak' | 'Fair' | 'Good' | 'Strong';
  strengthScore: number;
  isCompromised: boolean;
  breachCount: number | null;
  checkingBreach: boolean;
  breachLookupFailed: boolean;
}

const strengthClasses: Record<PasswordSecurityPanelProps['strengthLabel'], string> = {
  Weak: 'text-destructive',
  Fair: 'text-amber-500',
  Good: 'text-sky-500',
  Strong: 'text-emerald-500',
};

export const PasswordSecurityPanel = ({
  password,
  requirements,
  strengthLabel,
  strengthScore,
  isCompromised,
  breachCount,
  checkingBreach,
  breachLookupFailed,
}: PasswordSecurityPanelProps) => {
  if (!password) return null;

  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn('font-medium', strengthClasses[strengthLabel])}>{strengthLabel}</span>
      </div>

      <div className="mb-3 flex gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full bg-border/70 transition-colors',
              index < strengthScore && (strengthLabel === 'Weak'
                ? 'bg-destructive'
                : strengthLabel === 'Fair'
                  ? 'bg-amber-500'
                  : strengthLabel === 'Good'
                    ? 'bg-sky-500'
                    : 'bg-emerald-500'),
            )}
          />
        ))}
      </div>

      <ul className="space-y-1.5">
        {requirements.map((requirement) => (
          <li
            key={requirement.text}
            className={cn(
              'flex items-center gap-2 text-sm',
              requirement.met ? 'text-emerald-500' : 'text-muted-foreground',
            )}
          >
            <Check className={cn('h-3.5 w-3.5', requirement.met ? 'opacity-100' : 'opacity-30')} />
            {requirement.text}
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t border-border/70 pt-3 text-sm">
        {checkingBreach ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner className="h-3.5 w-3.5" />
            Checking known breach databases...
          </div>
        ) : isCompromised ? (
          <div className="flex items-start gap-2 text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4" />
            <span>
              This password appears in known breach data{breachCount ? ` (${breachCount.toLocaleString()} times)` : ''}. Pick a different one.
            </span>
          </div>
        ) : breachLookupFailed ? (
          <div className="flex items-start gap-2 text-amber-500">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span>Could not verify breach status right now. Strength checks still apply.</span>
          </div>
        ) : password.length >= 10 ? (
          <div className="flex items-start gap-2 text-emerald-500">
            <ShieldCheck className="mt-0.5 h-4 w-4" />
            <span>No match found in the breach lookup.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
