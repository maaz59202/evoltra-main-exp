import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TwoFactorSetup from '@/components/settings/TwoFactorSetup';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_DEFINITIONS } from '@/data/productCopy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  CreditCard, 
  Moon, 
  Sun, 
  Mail,
  MessageSquare,
  Users,
  FileText,
  Lock,
  Smartphone,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isTeam, subscriptionEnd, loading: subLoading, openCustomerPortal, checkSubscription } = useSubscription();
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    projectUpdates: true,
    clientMessages: true,
    teamActivity: true,
    invoiceReminders: true,
    marketingEmails: false,
  });
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  

  useEffect(() => {
    let dark = false;
    try {
      dark = localStorage.getItem('theme') === 'dark';
    } catch {
      dark = false;
    }
    setIsDark(dark);
    
    // Load saved settings from localStorage
    let savedNotifications: string | null = null;
    try {
      savedNotifications = localStorage.getItem('notificationSettings');
    } catch {
      savedNotifications = null;
    }
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
    
    let savedProfile: string | null = null;
    try {
      savedProfile = localStorage.getItem('profileSettings');
    } catch {
      savedProfile = null;
    }
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setFullName(profile.fullName || '');
      setBusinessName(profile.businessName || '');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    try {
      localStorage.setItem('theme', newDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors on restricted browsers/modes
    }
    document.documentElement.classList.toggle('dark', newDark);
    toast.success(`Switched to ${newDark ? 'dark' : 'light'} mode`);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      try {
        localStorage.setItem('profileSettings', JSON.stringify({ fullName, businessName }));
      } catch {
        // Ignore storage errors on restricted browsers/modes
      }
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    } catch {
      // Ignore storage errors on restricted browsers/modes
    }
    toast.success('Notification preferences saved');
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };


  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) {
        // Check if it's a "no customer" error - redirect to pricing
        if (error.message?.includes('No Stripe customer') || error.message?.includes('customer')) {
          toast.info('No active subscription. Redirecting to pricing...');
          navigate('/pricing');
          return;
        }
        throw error;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      // Handle the case where user has no subscription
      if (error?.message?.includes('No Stripe customer') || error?.context?.body?.includes('No Stripe customer')) {
        toast.info('No active subscription. Redirecting to pricing...');
        navigate('/pricing');
        return;
      }
      toast.error('Failed to open subscription management. Please try upgrading first.');
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="inline-flex w-full overflow-x-auto whitespace-nowrap lg:w-auto">
          <TabsTrigger value="profile" className="gap-2 shrink-0">
            <User className="h-4 w-4 hidden sm:block" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 shrink-0">
            <Bell className="h-4 w-4 hidden sm:block" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 shrink-0">
            <Shield className="h-4 w-4 hidden sm:block" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 shrink-0">
            <Palette className="h-4 w-4 hidden sm:block" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2 shrink-0">
            <CreditCard className="h-4 w-4 hidden sm:block" />
            Subscription
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal and business information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="businessName">Business / Company Name</Label>
                  <Input 
                    id="businessName" 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter your business name"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Project Updates</p>
                      <p className="text-sm text-muted-foreground">Get notified about project changes</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, projectUpdates: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Client Messages</p>
                      <p className="text-sm text-muted-foreground">Notify when clients send messages</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.clientMessages}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, clientMessages: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Team Activity</p>
                      <p className="text-sm text-muted-foreground">Updates from team members</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.teamActivity}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, teamActivity: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Invoice Reminders</p>
                      <p className="text-sm text-muted-foreground">Reminders for unpaid invoices</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.invoiceReminders}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, invoiceReminders: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-muted-foreground">Tips, updates and promotions</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.marketingEmails}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, marketingEmails: checked }))
                    }
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
                
                <div className="flex justify-end">
                  <Button onClick={handleUpdatePassword} disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <TwoFactorSetup />
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how Evoltra looks for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground">
                      Currently using {isDark ? 'dark' : 'light'} mode
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={toggleTheme}>
                  Switch to {isDark ? 'Light' : 'Dark'} Mode
                </Button>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card 
                  className={`cursor-pointer transition-all ${!isDark ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                  onClick={() => isDark && toggleTheme()}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center">
                        <Sun className="h-6 w-6 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">Light Mode</p>
                        <p className="text-sm text-muted-foreground">Clean and bright</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all ${isDark ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                  onClick={() => !isDark && toggleTheme()}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-slate-900 border flex items-center justify-center">
                        <Moon className="h-6 w-6 text-slate-300" />
                      </div>
                      <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-muted-foreground">Easy on the eyes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>Manage your subscription and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">Current Plan</p>
                    {subLoading ? (
                      <Badge variant="outline">Loading...</Badge>
                    ) : isTeam ? (
                      <Badge className="bg-primary text-primary-foreground">{PLAN_DEFINITIONS.team.name}</Badge>
                    ) : (
                      <Badge variant="secondary">{PLAN_DEFINITIONS.solo.name}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={subLoading}
                      onClick={async () => {
                        await checkSubscription();
                        toast.success('Subscription status refreshed');
                      }}
                    >
                      <RefreshCw className={`h-4 w-4 ${subLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="hidden">
                    {isTeam 
                      ? `Team plan active${subscriptionEnd ? ` · Renews ${new Date(subscriptionEnd).toLocaleDateString()}` : ''}`
                      : 'Free plan with basic features'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isTeam
                      ? `${PLAN_DEFINITIONS.team.name} plan active${subscriptionEnd ? ` · Renews ${new Date(subscriptionEnd).toLocaleDateString()}` : ''}`
                      : `${PLAN_DEFINITIONS.solo.priceLabel} plan with core features`}
                  </p>
                </div>
                {isTeam ? (
                  <Button variant="outline" onClick={async () => {
                    try {
                      await openCustomerPortal();
                    } catch {
                      toast.error('Failed to open billing portal');
                    }
                  }} className="gap-2">
                    Manage Subscription
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleUpgrade} className="gap-2">
                    Upgrade to {PLAN_DEFINITIONS.team.name}
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Plan Comparison</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        {PLAN_DEFINITIONS.solo.name} ({PLAN_DEFINITIONS.solo.priceLabel})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {PLAN_DEFINITIONS.solo.pricingFeatures
                          .filter((feature) => feature.included)
                          .map((feature) => (
                            <li key={feature.text} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {feature.text}
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-primary">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {PLAN_DEFINITIONS.team.name} ({PLAN_DEFINITIONS.team.priceLabel}{PLAN_DEFINITIONS.team.period})
                        </CardTitle>
                        <Badge variant="secondary">Recommended</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {PLAN_DEFINITIONS.team.pricingFeatures
                          .filter((feature) => feature.included)
                          .map((feature) => (
                            <li key={feature.text} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {feature.text}
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Manage Billing</p>
                  <p className="text-sm text-muted-foreground">
                    Update payment methods, view invoices, and more
                  </p>
                </div>
                {isTeam ? (
                  <Button variant="outline" onClick={async () => {
                    try {
                      await openCustomerPortal();
                    } catch {
                      toast.error('Failed to open billing portal');
                    }
                  }}>
                    Open Billing Portal
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => navigate('/billing')}>
                    View Billing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
