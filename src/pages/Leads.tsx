import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, ExternalLink, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Lead {
  id: string;
  funnel_id: string;
  organization_id: string;
  data: Record<string, string>;
  source_url: string;
  created_at: string;
  funnel_name?: string;
}

const Leads = () => {
  const { user } = useAuth();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      // First get organization membership
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!membership) return [];

      // Get leads with funnel info
      const { data: leadsData, error } = await supabase
        .from('leads' as any)
        .select('*')
        .eq('organization_id', membership.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get funnel names
      const funnelIds = [...new Set((leadsData as unknown as Lead[]).map(l => l.funnel_id))];
      
      if (funnelIds.length === 0) return leadsData as unknown as Lead[];
      
      const { data: funnels } = await supabase
        .from('funnels' as any)
        .select('id, name')
        .in('id', funnelIds);

      const funnelMap = new Map((funnels as unknown as Array<{id: string; name: string}> || []).map((f) => [f.id, f.name]));

      return (leadsData as unknown as Lead[]).map(lead => ({
        ...lead,
        funnel_name: funnelMap.get(lead.funnel_id) || 'Unknown Funnel',
      }));
    },
    enabled: !!user,
  });

  const getDataFields = (data: Record<string, string>) => {
    return Object.entries(data).map(([key, value]) => (
      <div key={key} className="text-sm">
        <span className="font-medium text-muted-foreground">{key}:</span>{' '}
        <span className="text-foreground">{value}</span>
      </div>
    ));
  };

  const exportToCSV = () => {
    if (leads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    // Get all unique data keys across all leads
    const allDataKeys = new Set<string>();
    leads.forEach(lead => {
      Object.keys(lead.data).forEach(key => allDataKeys.add(key));
    });
    const dataKeys = Array.from(allDataKeys);

    // Build CSV header
    const headers = ['Date', 'Funnel', ...dataKeys, 'Source URL'];
    
    // Build CSV rows
    const rows = leads.map(lead => {
      const dataValues = dataKeys.map(key => lead.data[key] || '');
      return [
        format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm:ss'),
        lead.funnel_name || 'Unknown',
        ...dataValues,
        lead.source_url || '',
      ];
    });

    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${leads.length} leads to CSV`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            View all captured leads from your funnels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            disabled={leads.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No leads yet</h2>
            <p className="text-muted-foreground text-center max-w-md">
              When visitors submit forms on your published funnels, their information will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>
              Leads captured from form submissions on your published funnels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Funnel</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.funnel_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getDataFields(lead.data)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.source_url && (
                        <a
                          href={lead.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Leads;
