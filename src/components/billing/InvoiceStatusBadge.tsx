import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InvoiceStatusBadgeProps {
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

const statusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground hover:bg-muted',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/20 dark:text-gray-400',
  },
};

const InvoiceStatusBadge = ({ status }: InvoiceStatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge variant="secondary" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
};

export default InvoiceStatusBadge;
