import { useGetSettings, useUpdateSettings, useUpdatePassword, useExportData, getGetSettingsQueryKey, getExportDataQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Download, Save, ShieldAlert } from "lucide-react";
import { useEffect } from "react";

const settingsSchema = z.object({
  wagePerPersonPerDay: z.coerce.number().min(0),
  monthlyRent: z.coerce.number().min(0),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(6, "Minimum 6 characters"),
});

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  
  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      wagePerPersonPerDay: 1000,
      monthlyRent: 25000,
    }
  });

  const pwdForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    }
  });

  useEffect(() => {
    if (settings) {
      settingsForm.reset(settings);
    }
  }, [settings, settingsForm]);

  const updateSettings = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings updated successfully" });
      }
    }
  });

  const updatePassword = useUpdatePassword({
    mutation: {
      onSuccess: () => {
        pwdForm.reset();
        toast({ title: "Password updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update password", variant: "destructive" });
      }
    }
  });

  const exportData = useExportData({ query: { enabled: false, queryKey: getExportDataQueryKey() } });

  function handleExport() {
    exportData.refetch().then(({ data }) => {
      if (!data) return;
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `gsc-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Backup downloaded successfully" });
    });
  }

  function onSettingsSubmit(data: z.infer<typeof settingsSchema>) {
    updateSettings.mutate({ data });
  }

  function onPwdSubmit(data: z.infer<typeof passwordSchema>) {
    updatePassword.mutate({ data });
  }

  if (settingsLoading) {
    return <div className="flex justify-center p-12"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-primary">System Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle>Business Variables</CardTitle>
            <CardDescription>Default values used in calculations across the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...settingsForm}>
              <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                <FormField control={settingsForm.control} name="wagePerPersonPerDay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wage per person per day (KES)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={settingsForm.control} name="monthlyRent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Rent (KES)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={updateSettings.isPending} className="bg-primary text-white w-full gap-2 mt-4">
                  {updateSettings.isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save Variables
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-black">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Update the administrator password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...pwdForm}>
              <form onSubmit={pwdForm.handleSubmit(onPwdSubmit)} className="space-y-4">
                <FormField control={pwdForm.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={pwdForm.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={updatePassword.isPending} className="bg-black text-white hover:bg-black/90 w-full gap-2 mt-4">
                  {updatePassword.isPending ? <Spinner className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />} Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-secondary md:col-span-2">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export your business data.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Button 
              onClick={handleExport}
              disabled={exportData.isFetching}
              className="bg-secondary text-black hover:bg-secondary/90 gap-2"
            >
              {exportData.isPending ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Download Full System Backup (JSON)
            </Button>
            <p className="text-sm text-gray-500">Includes all jobs, expenses, clients, and receipts.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
