import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PLAN_DEFINITIONS } from '@/data/productCopy';
import { Loader2, ArrowLeft, ArrowRight, User, Building, Target, Check } from 'lucide-react';

type Mode = 'solo' | 'team';

const goals = [
  'Manage client projects',
  'Build landing pages & funnels',
  'Track tasks & deadlines',
  'Collaborate with team members',
  'Invoice clients',
  'Grow my freelance business'
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const totalSteps = 3;

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return mode !== null;
      case 2: return companyName.trim().length > 0;
      case 3: return selectedGoals.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    const { error } = await updateProfile({
      mode,
      company_name: companyName,
      goals: selectedGoals,
      onboarding_completed: true
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save your preferences. Please try again.'
      });
      setLoading(false);
      return;
    }

    toast({
      title: 'Welcome to Evoltra!',
      description: mode === 'team' 
        ? `Complete your ${PLAN_DEFINITIONS.team.name} subscription to unlock all features.` 
        : 'Your account is all set up.'
    });

    // Team mode users need to subscribe before getting team features
    navigate(mode === 'team' ? '/pricing' : '/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-hero-pattern opacity-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full gradient-primary transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card className="glass-card animate-fade-in">
          {/* Step 1: Mode Selection */}
          {step === 1 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome to Evoltra!</CardTitle>
                <CardDescription>
                  How will you be using Evoltra?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <button
                  onClick={() => setMode('solo')}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                    mode === 'solo' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-glass-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      mode === 'solo' ? 'gradient-primary text-white' : 'bg-secondary'
                    }`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{PLAN_DEFINITIONS.solo.name}</h3>
                      <p className="text-muted-foreground text-sm">
                        I'm a freelancer working independently on client projects.
                      </p>
                    </div>
                    {mode === 'solo' && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setMode('team')}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                    mode === 'team' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-glass-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      mode === 'team' ? 'gradient-primary text-white' : 'bg-secondary'
                    }`}>
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{PLAN_DEFINITIONS.team.name}</h3>
                      <p className="text-muted-foreground text-sm">
                        I'm running an agency or working with team members.
                      </p>
                    </div>
                    {mode === 'team' && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </button>
              </CardContent>
            </>
          )}

          {/* Step 2: Company Name */}
          {step === 2 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {mode === 'team' ? "What's your agency called?" : "What's your business name?"}
                </CardTitle>
                <CardDescription>
                  This will be displayed in your workspace and client portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      {mode === 'team' ? 'Agency Name' : 'Business Name'}
                    </Label>
                    <Input
                      id="companyName"
                      placeholder={mode === 'team' ? 'Acme Agency' : 'John Doe Consulting'}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-background/50 text-lg h-12"
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">What are your main goals?</CardTitle>
                <CardDescription>
                  Select all that apply. This helps us personalize your experience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {goals.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      className={`p-4 rounded-xl border-2 transition-all text-left text-sm ${
                        selectedGoals.includes(goal)
                          ? 'border-primary bg-primary/5'
                          : 'border-glass-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          selectedGoals.includes(goal) 
                            ? 'gradient-primary text-white' 
                            : 'border-2 border-muted-foreground/30'
                        }`}>
                          {selectedGoals.includes(goal) && <Check className="w-3 h-3" />}
                        </div>
                        <span>{goal}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button 
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="gradient-primary text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : step === totalSteps ? (
                <>
                  Complete Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
